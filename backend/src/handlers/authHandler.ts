import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  deviceFp?: string;
}

export function mockAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const incomingUser = (req.headers['x-user-id'] as string) || (req.headers['x-device-fp'] as string);
  req.userId = incomingUser || 'demo-user';
  req.deviceFp = (req.headers['x-device-fp'] as string) || req.userId || 'web-default';
  next();
}
