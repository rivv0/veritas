import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { userRepository } from '../repositories/userRepository';
import { watchlistRepository } from '../repositories/watchlistRepository';
import { User, UserPublicProfile, JwtPayload } from '../domain/types';

export class AuthService {
  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private toPublicProfile(user: User): UserPublicProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  private generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.accessTokenTtlSec,
    });
  }

  async signup(dto: {
    email: string;
    password: string;
    name: string;
    guestDeviceId?: string;
  }): Promise<{ user: UserPublicProfile; accessToken: string; rawRefreshToken: string }> {
    const cleanEmail = dto.email.trim().toLowerCase();
    const cleanName = dto.name.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please provide a valid email address');
    }
    if (!cleanName) {
      throw new Error('Name is required');
    }
    if (!dto.password || dto.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (!/[A-Za-z]/.test(dto.password) || !/[0-9]/.test(dto.password)) {
      throw new Error('Password must contain at least one letter and one number');
    }

    const existingUser = await userRepository.findUserByEmail(cleanEmail);
    if (existingUser) {
      const err: any = new Error('An account with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const userId = crypto.randomUUID();

    const newUser = await userRepository.createUser({
      id: userId,
      email: cleanEmail,
      name: cleanName,
      passwordHash,
      role: 'trader',
    });

    // Guest migration & deduplication
    if (dto.guestDeviceId && dto.guestDeviceId.trim().length > 0) {
      const guestId = dto.guestDeviceId.trim();
      const guestWatchlists = await watchlistRepository.findByUserId(guestId);
      if (guestWatchlists.length > 0) {
        // Guest already created watchlists -> Re-key existing guest watchlists/alerts to new user
        await userRepository.rekeyGuestData(guestId, newUser.id);
      } else {
        // Guest had no custom watchlists -> seed defaults
        await watchlistRepository.seedDefaultsForUser(newUser.id);
      }
    } else {
      // Direct signup with no guest device -> seed defaults
      await watchlistRepository.seedDefaultsForUser(newUser.id);
    }

    // Issue initial access token and refresh token with a new family ID
    const familyId = crypto.randomUUID();
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + config.auth.refreshTokenTtlSec * 1000);

    await userRepository.createRefreshToken({
      id: tokenId,
      familyId,
      userId: newUser.id,
      tokenHash,
      expiresAt,
    });

    const accessToken = this.generateAccessToken(newUser);
    return {
      user: this.toPublicProfile(newUser),
      accessToken,
      rawRefreshToken,
    };
  }

  async login(dto: {
    email: string;
    password: string;
  }): Promise<{ user: UserPublicProfile; accessToken: string; rawRefreshToken: string }> {
    const cleanEmail = dto.email.trim().toLowerCase();
    const user = await userRepository.findUserByEmail(cleanEmail);

    if (!user) {
      const err: any = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    // OAuth Guard: reject accounts registered via external OAuth if no passwordHash set
    if (!user.passwordHash) {
      const err: any = new Error('This account was registered via OAuth. Please sign in using your OAuth provider.');
      err.statusCode = 400;
      throw err;
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      const err: any = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    // Issue new session with new family ID
    const familyId = crypto.randomUUID();
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + config.auth.refreshTokenTtlSec * 1000);

    await userRepository.createRefreshToken({
      id: tokenId,
      familyId,
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const accessToken = this.generateAccessToken(user);
    return {
      user: this.toPublicProfile(user),
      accessToken,
      rawRefreshToken,
    };
  }

  async rotateRefreshToken(
    rawRefreshToken: string
  ): Promise<{ user: UserPublicProfile; accessToken: string; rawRefreshToken: string }> {
    if (!rawRefreshToken) {
      const err: any = new Error('Refresh token is required');
      err.statusCode = 401;
      throw err;
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const nextTokenId = crypto.randomUUID();

    // Atomic claim: updates revoked_at and replaced_by only if revoked_at IS NULL
    const claimed = await userRepository.claimRefreshToken(tokenHash, nextTokenId);

    if (!claimed) {
      // 0 rows updated -> either already revoked (reuse attack) or does not exist
      const existing = await userRepository.findRefreshTokenByHash(tokenHash);
      if (existing && existing.revokedAt) {
        // REUSE DETECTED: Revoke entire token family and invalidate all user tokens
        await userRepository.revokeRefreshTokenFamily(existing.familyId);
        await userRepository.incrementTokenVersion(existing.userId);
        const err: any = new Error('Refresh token reuse detected. All sessions revoked for security.');
        err.statusCode = 401;
        throw err;
      }
      const err: any = new Error('Invalid or expired refresh token');
      err.statusCode = 401;
      throw err;
    }

    if (claimed.expiresAt.getTime() < Date.now()) {
      const err: any = new Error('Refresh token has expired');
      err.statusCode = 401;
      throw err;
    }

    const user = await userRepository.findUserById(claimed.userId);
    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 401;
      throw err;
    }

    // Create successor token within the SAME family
    const nextRawRefreshToken = crypto.randomBytes(32).toString('hex');
    const nextTokenHash = this.hashToken(nextRawRefreshToken);
    const nextExpiresAt = new Date(Date.now() + config.auth.refreshTokenTtlSec * 1000);

    await userRepository.createRefreshToken({
      id: nextTokenId,
      familyId: claimed.familyId,
      userId: user.id,
      tokenHash: nextTokenHash,
      expiresAt: nextExpiresAt,
    });

    const accessToken = this.generateAccessToken(user);
    return {
      user: this.toPublicProfile(user),
      accessToken,
      rawRefreshToken: nextRawRefreshToken,
    };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = this.hashToken(rawRefreshToken);
    await userRepository.claimRefreshToken(tokenHash, 'logout');
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await userRepository.incrementTokenVersion(userId);
  }

  async verifyAccessToken(token: string): Promise<UserPublicProfile> {
    try {
      const payload = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
      const user = await userRepository.findUserById(payload.sub);
      if (!user) {
        const err: any = new Error('User not found');
        err.statusCode = 401;
        throw err;
      }
      if (user.tokenVersion !== payload.tokenVersion) {
        const err: any = new Error('Token has been revoked. Please sign in again.');
        err.statusCode = 401;
        throw err;
      }
      return this.toPublicProfile(user);
    } catch (err: any) {
      if (err.statusCode) throw err;
      const authErr: any = new Error('Invalid or expired access token');
      authErr.statusCode = 401;
      throw authErr;
    }
  }
}

export const authService = new AuthService();
