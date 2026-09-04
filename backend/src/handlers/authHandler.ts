import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  deviceFp?: string;
}

export function mockAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  req.userId = (req.headers['x-user-id'] as string) || 'demo-user';
  req.deviceFp = (req.headers['x-device-fp'] as string) || 'web-default';
  next();
}
