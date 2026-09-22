import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { UserPublicProfile } from '../domain/types';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: UserPublicProfile;
  userId?: string;
  deviceFp?: string;
}

const isProduction = process.env.NODE_ENV === 'production';

export function setRefreshTokenCookie(res: Response, rawRefreshToken: string): void {
  res.cookie(config.auth.cookieName, rawRefreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: config.auth.refreshTokenTtlSec * 1000,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(config.auth.cookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}

/**
 * Universal authentication middleware:
 * - If Authorization header with Bearer token is provided, verifies JWT.
 * - If verified, sets req.user, req.userId, req.deviceFp.
 * - If token invalid/expired, returns 401.
 * - If no Authorization header, falls back to guest mode (x-device-fp or demo-user).
 */
export async function jwtAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const user = await authService.verifyAccessToken(token);
      req.user = user;
      req.userId = user.id;
      req.deviceFp = (req.headers['x-device-fp'] as string) || user.id;
      return next();
    } catch (err: any) {
      res.status(401).json({
        error: 'Unauthorized',
        message: err.message || 'Invalid or expired access token',
      });
      return;
    }
  }

  // Fallback to guest mode
  const guestDeviceId = (req.headers['x-device-fp'] as string) || (req.headers['x-user-id'] as string);
  req.userId = guestDeviceId || 'demo-user';
  req.deviceFp = (req.headers['x-device-fp'] as string) || req.userId || 'web-default';
  next();
}

/**
 * Strict middleware for routes that require an authenticated registered user account.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please sign in.',
    });
    return;
  }
  next();
}

/**
 * CSRF protection for cookie-authenticated endpoints.
 * Requires custom header 'X-Veritas-Client: web'
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const clientHeader = req.headers['x-veritas-client'];
  if (clientHeader !== 'web') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Missing or invalid CSRF client verification header (X-Veritas-Client).',
    });
    return;
  }
  next();
}

// Route Handlers

export async function signupHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, guestDeviceId } = req.body;
    const result = await authService.signup({
      email,
      password,
      name,
      guestDeviceId,
    });

    setRefreshTokenCookie(res, result.rawRefreshToken);
    res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.message.includes('already exists') ? 409 : 400);
    res.status(statusCode).json({
      error: 'Signup Failed',
      message: err.message || 'Failed to create account',
    });
  }
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Bad Request', message: 'Email and password are required' });
      return;
    }

    const result = await authService.login({ email, password });
    setRefreshTokenCookie(res, result.rawRefreshToken);
    res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 401;
    res.status(statusCode).json({
      error: 'Login Failed',
      message: err.message || 'Invalid credentials',
    });
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawToken = req.cookies?.[config.auth.cookieName] || req.body?.refreshToken;
    if (!rawToken) {
      clearRefreshTokenCookie(res);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No refresh token provided',
      });
      return;
    }

    const result = await authService.rotateRefreshToken(rawToken);
    setRefreshTokenCookie(res, result.rawRefreshToken);
    res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err: any) {
    clearRefreshTokenCookie(res);
    const statusCode = err.statusCode || 401;
    res.status(statusCode).json({
      error: 'Refresh Failed',
      message: err.message || 'Failed to refresh token',
    });
  }
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawToken = req.cookies?.[config.auth.cookieName] || req.body?.refreshToken;
    if (rawToken) {
      await authService.logout(rawToken);
    }
    clearRefreshTokenCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err: any) {
    clearRefreshTokenCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out',
    });
  }
}

export async function meHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.status(200).json({
    user: req.user,
  });
}

export async function revokeAllSessionsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    await authService.revokeAllSessions(req.user.id);
    clearRefreshTokenCookie(res);
    res.status(200).json({
      success: true,
      message: 'All sessions successfully revoked',
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Revocation Failed',
      message: err.message || 'Failed to revoke sessions',
    });
  }
}
