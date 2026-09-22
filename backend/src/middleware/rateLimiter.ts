import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later.' } = options;
  const store = new Map<string, RateLimitRecord>();

  // Periodically clean up stale records every 5 minutes
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : Array.isArray(forwarded)
      ? forwarded[0].trim()
      : req.ip || req.socket.remoteAddress || 'unknown';
    const clientKey = String(clientIp);

    const now = Date.now();
    let record = store.get(clientKey);
    if (!record) {
      record = { timestamps: [] };
      store.set(clientKey, record);
    }

    record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const oldest = record.timestamps[0];
      const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfterSec)));
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.max(1, retryAfterSec),
      });
      return;
    }

    record.timestamps.push(now);
    next();
  };
}

// 25 requests per 15 minutes for sensitive auth endpoints (prevents false-positive lockouts behind reverse proxies)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 25,
  message: 'Too many authentication attempts. Please wait a few minutes before trying again.',
});
