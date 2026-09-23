import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../src/services/authService';
import { userRepository } from '../src/repositories/userRepository';
import { watchlistRepository } from '../src/repositories/watchlistRepository';
import { createRateLimiter, authRateLimiter, passwordResetRateLimiter } from '../src/middleware/rateLimiter';

describe('VERITAS Production Authentication Engine', () => {
  const testEmail = `trader_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Veritas Trader';

  describe('User Signup & Validation', () => {
    it('successfully signs up a new user with bcrypt hash, JWT, and refresh token', async () => {
      const result = await authService.signup({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail.toLowerCase());
      expect(result.user.name).toBe(testName);
      expect(result.user.role).toBe('trader');
      expect((result.user as any).passwordHash).toBeUndefined(); // passwordHash not exposed in public profile
      expect(result.accessToken).toBeTypeOf('string');
      expect(result.rawRefreshToken).toBeTypeOf('string');
      expect(result.rawRefreshToken.length).toBeGreaterThan(30);

      // Verify access token
      const verified = await authService.verifyAccessToken(result.accessToken);
      expect(verified.id).toBe(result.user.id);
      expect(verified.email).toBe(testEmail.toLowerCase());
    });

    it('rejects duplicate email signup with 409 conflict', async () => {
      await expect(
        authService.signup({
          email: testEmail,
          password: 'AnotherPassword456!',
          name: 'Imposter',
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('rejects weak password under 8 characters', async () => {
      await expect(
        authService.signup({
          email: 'weak@example.com',
          password: 'pass1',
          name: 'Weak Pass',
        })
      ).rejects.toThrow(/at least 8 characters/i);
    });

    it('rejects password without numbers', async () => {
      await expect(
        authService.signup({
          email: 'nonum@example.com',
          password: 'allletterslongpassword',
          name: 'No Number',
        })
      ).rejects.toThrow(/contain at least one letter and one number/i);
    });
  });

  describe('User Login & OAuth Guard', () => {
    it('successfully logs in with correct email and password', async () => {
      const result = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      expect(result.user.email).toBe(testEmail.toLowerCase());
      expect(result.accessToken).toBeTypeOf('string');
      expect(result.rawRefreshToken).toBeTypeOf('string');
    });

    it('rejects login with incorrect password', async () => {
      await expect(
        authService.login({
          email: testEmail,
          password: 'WrongPassword999!',
        })
      ).rejects.toThrow(/Invalid email or password/i);
    });

    it('rejects login for nonexistent email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
      ).rejects.toThrow(/Invalid email or password/i);
    });

    it('OAuth Guard: rejects password login for accounts with null passwordHash', async () => {
      const oauthUserId = `oauth-user-${Date.now()}`;
      const oauthEmail = `oauth_${Date.now()}@example.com`;
      await userRepository.createUser({
        id: oauthUserId,
        email: oauthEmail,
        name: 'OAuth Trader',
        passwordHash: null,
      });

      await expect(
        authService.login({
          email: oauthEmail,
          password: 'AnyPassword123!',
        })
      ).rejects.toThrow(/registered via OAuth/i);
    });
  });

  describe('Refresh Token Rotation & Family Reuse Detection', () => {
    it('successfully rotates refresh token on valid presentation', async () => {
      const loginRes = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      const rotated = await authService.rotateRefreshToken(loginRes.rawRefreshToken);
      expect(rotated.accessToken).toBeTypeOf('string');
      expect(rotated.rawRefreshToken).toBeTypeOf('string');
      expect(rotated.rawRefreshToken).not.toBe(loginRes.rawRefreshToken);

      // Verify the new access token works
      const verified = await authService.verifyAccessToken(rotated.accessToken);
      expect(verified.email).toBe(testEmail.toLowerCase());
    });

    it('CRITICAL: detects token reuse, revokes family, and invalidates user sessions', async () => {
      // 1. User logs in -> gets Token A
      const loginRes = await authService.login({
        email: testEmail,
        password: testPassword,
      });
      const tokenA = loginRes.rawRefreshToken;

      // 2. Legitimate rotation: Token A -> Token B
      const rotate1 = await authService.rotateRefreshToken(tokenA);
      const tokenB = rotate1.rawRefreshToken;

      // 3. Legitimate rotation: Token B -> Token C
      const rotate2 = await authService.rotateRefreshToken(tokenB);
      const tokenC = rotate2.rawRefreshToken;

      // 4. ATTACK: Attacker presents already-rotated Token A!
      await expect(authService.rotateRefreshToken(tokenA)).rejects.toThrow(
        /Refresh token reuse detected. All sessions revoked for security/i
      );

      // 5. Verify family was destroyed: presenting Token C is now rejected
      await expect(authService.rotateRefreshToken(tokenC)).rejects.toThrow(
        /Refresh token reuse detected|Invalid or expired refresh token/i
      );

      // 6. Verify existing access tokens issued before revocation are now rejected (token_version incremented)
      await expect(authService.verifyAccessToken(rotate2.accessToken)).rejects.toThrow(
        /Token has been revoked/i
      );
    });
  });

  describe('Guest Migration & Deduplication', () => {
    it('migrates guest watchlists, alerts, and retires guest session upon signup', async () => {
      const guestDeviceId = `guest-device-${Date.now()}`;
      
      // Guest creates custom watchlist
      const customWatchlist = await watchlistRepository.create(guestDeviceId, 'My Guest Alpha');
      await watchlistRepository.addSymbol(customWatchlist.id, 'NVDA');

      // Guest signs up
      const signupEmail = `migrated_${Date.now()}@example.com`;
      const signupRes = await authService.signup({
        email: signupEmail,
        password: 'MigratedPass123!',
        name: 'Migrated User',
        guestDeviceId,
      });

      // Verify watchlists now belong to signupRes.user.id
      const userWatchlists = await watchlistRepository.findByUserId(signupRes.user.id);
      expect(userWatchlists.some(w => w.name === 'My Guest Alpha')).toBe(true);

      // Verify guest device has 0 watchlists left
      const oldGuestWatchlists = await watchlistRepository.findByUserId(guestDeviceId);
      expect(oldGuestWatchlists.length).toBe(0);
    });
  });

  describe('Rate Limiter Sliding Window & Reverse Proxy Parsing', () => {
    it('enforces request limit and returns 429 when max requests exceeded', () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        maxRequests: 3,
        message: 'Rate limit test hit',
      });

      const mockReq = { ip: '127.0.0.99', headers: {}, socket: {} } as any;
      let statusCode = 200;
      let jsonPayload: any = null;
      let headerVal: string | null = null;

      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => { jsonPayload = data; },
          };
        },
        setHeader: (name: string, val: string) => {
          if (name === 'Retry-After') headerVal = val;
        },
      } as any;

      let nextCalls = 0;
      const next = () => { nextCalls++; };

      // First 3 calls should pass
      limiter(mockReq, mockRes, next);
      limiter(mockReq, mockRes, next);
      limiter(mockReq, mockRes, next);
      expect(nextCalls).toBe(3);
      expect(statusCode).toBe(200);

      // 4th call should be blocked
      limiter(mockReq, mockRes, next);
      expect(nextCalls).toBe(3);
      expect(statusCode).toBe(429);
      expect(jsonPayload?.error).toBe('Too Many Requests');
      expect(headerVal).toBeDefined();
    });

    it('correctly parses comma-separated x-forwarded-for header behind reverse proxies', () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        maxRequests: 2,
      });

      const mockReqA = { headers: { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }, socket: {} } as any;
      const mockReqB = { headers: { 'x-forwarded-for': '198.51.100.2, 10.0.0.1' }, socket: {} } as any;

      let nextCallsA = 0;
      let nextCallsB = 0;

      limiter(mockReqA, {} as any, () => { nextCallsA++; });
      limiter(mockReqA, {} as any, () => { nextCallsA++; });

      // Client B has different client IP even though proxy IP is the same
      limiter(mockReqB, {} as any, () => { nextCallsB++; });
      expect(nextCallsA).toBe(2);
      expect(nextCallsB).toBe(1);
    });
  });

  describe('Password Reset Flow (Forgot Password)', () => {
    const resetUserEmail = `reset_trader_${Date.now()}@example.com`;
    const initialPassword = 'InitialPassword123!';
    const newPassword = 'NewSecretPassword456!';

    it('generates a 6-digit verification reset code for an existing user', async () => {
      await authService.signup({
        email: resetUserEmail,
        password: initialPassword,
        name: 'Reset Test Trader',
      });

      const res = await authService.requestPasswordReset(resetUserEmail);
      expect(res.success).toBe(true);
      expect(res.resetCode).toBeDefined();
      expect(res.resetCode?.length).toBe(6);
      expect(res.expiresInMinutes).toBe(15);
    });

    it('returns generic message without leaking account existence for non-existent email', async () => {
      const res = await authService.requestPasswordReset('nobody_exists_here_999@example.com');
      expect(res.success).toBe(true);
      expect(res.resetCode).toBeUndefined();
      expect(res.message).toMatch(/If an account exists/i);
    });

    it('rejects reset with invalid code or weak password', async () => {
      await expect(
        authService.resetPassword({
          email: resetUserEmail,
          token: '999999', // wrong code
          newPassword,
        })
      ).rejects.toThrow(/Invalid or expired password reset code/i);

      await expect(
        authService.resetPassword({
          email: resetUserEmail,
          token: '123456',
          newPassword: 'short',
        })
      ).rejects.toThrow(/at least 8 characters/i);
    });

    it('successfully resets password, allows login with new password, and revokes old sessions', async () => {
      // 1. Log in with initial password to get an active session
      const oldSession = await authService.login({
        email: resetUserEmail,
        password: initialPassword,
      });
      expect(oldSession.accessToken).toBeDefined();

      // 2. Request reset code
      const requestRes = await authService.requestPasswordReset(resetUserEmail);
      const resetCode = requestRes.resetCode!;

      // 3. Reset password
      const resetRes = await authService.resetPassword({
        email: resetUserEmail,
        token: resetCode,
        newPassword,
      });
      expect(resetRes.success).toBe(true);

      // 4. Old password can no longer log in
      await expect(
        authService.login({
          email: resetUserEmail,
          password: initialPassword,
        })
      ).rejects.toThrow(/Invalid email or password/i);

      // 5. New password logs in successfully
      const newSession = await authService.login({
        email: resetUserEmail,
        password: newPassword,
      });
      expect(newSession.user.email).toBe(resetUserEmail.toLowerCase());
      expect(newSession.accessToken).toBeDefined();

      // 6. Old session's access token is revoked
      await expect(authService.verifyAccessToken(oldSession.accessToken)).rejects.toThrow(
        /Token has been revoked/i
      );

      // 7. Reusing the same reset code again is rejected (one-time use)
      await expect(
        authService.resetPassword({
          email: resetUserEmail,
          token: resetCode,
          newPassword: 'AnotherPassword789!',
        })
      ).rejects.toThrow(/Invalid or expired password reset code/i);
    });

    it('omits resetCode in API response when NODE_ENV is production (Hole #2 fix)', async () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await authService.requestPasswordReset(resetUserEmail);
        expect(res.success).toBe(true);
        expect(res.resetCode).toBeUndefined();
        expect(res.message).toMatch(/If an account exists/i);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('invalidates prior unused reset codes when a new code is requested', async () => {
      // First reset request
      const req1 = await authService.requestPasswordReset(resetUserEmail);
      const code1 = req1.resetCode!;
      expect(code1).toBeDefined();

      // Second reset request (mints a new code, invalidating code1)
      const req2 = await authService.requestPasswordReset(resetUserEmail);
      const code2 = req2.resetCode!;
      expect(code2).toBeDefined();
      expect(code2).not.toEqual(code1);

      // Attempting to use the invalidated old code1 should fail
      await expect(
        authService.resetPassword({
          email: resetUserEmail,
          token: code1,
          newPassword: 'NewUpdatedPassword999!',
        })
      ).rejects.toThrow(/Invalid or expired password reset code/i);

      // Using the latest code2 succeeds
      const resetRes = await authService.resetPassword({
        email: resetUserEmail,
        token: code2,
        newPassword: 'NewUpdatedPassword999!',
      });
      expect(resetRes.success).toBe(true);
    });

    it('rate limits reset requests per-email even when client IP rotates', () => {
      let blocked = false;
      const targetEmail = `botnet_target_${Date.now()}@example.com`;

      // 5 requests from 5 distinct IPs against the SAME email
      for (let i = 1; i <= 5; i++) {
        const req = {
          headers: { 'x-forwarded-for': `198.51.100.${i}` },
          body: { email: targetEmail },
        } as any;
        const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
        passwordResetRateLimiter(req, res, () => {});
      }

      // 6th request from another fresh IP should be blocked by email-level rate limiting
      const req6 = {
        headers: { 'x-forwarded-for': '203.0.113.42' },
        body: { email: targetEmail },
      } as any;
      const res6 = {
        setHeader: vi.fn(),
        status: vi.fn().mockImplementation((code) => {
          if (code === 429) blocked = true;
          return res6;
        }),
        json: vi.fn(),
      } as any;
      passwordResetRateLimiter(req6, res6, () => {});

      expect(blocked).toBe(true);
    });
  });
});
