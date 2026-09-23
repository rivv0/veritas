import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request, clientIp: string) => string | string[];
}) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later.', keyGenerator } = options;
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

    const generated = keyGenerator ? keyGenerator(req, String(clientIp)) : String(clientIp);
    const keys = Array.isArray(generated) ? generated : [generated];

    const now = Date.now();
    let limited = false;
    let maxRetryAfter = 1;

    for (const k of keys) {
      let record = store.get(k);
      if (!record) {
        record = { timestamps: [] };
        store.set(k, record);
      }
      record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);
      if (record.timestamps.length >= maxRequests) {
        limited = true;
        const oldest = record.timestamps[0];
        const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
        maxRetryAfter = Math.max(maxRetryAfter, retryAfterSec);
      }
    }

    if (limited) {
      res.setHeader('Retry-After', String(maxRetryAfter));
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: maxRetryAfter,
      });
      return;
    }

    for (const k of keys) {
      store.get(k)!.timestamps.push(now);
    }

    next();
  };
}

// 25 requests per 15 minutes for sensitive auth endpoints (keyed by IP and ip:email to prevent account spray)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 25,
  message: 'Too many authentication attempts. Please wait a few minutes before trying again.',
  keyGenerator: (req, clientIp) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email) {
      return [`auth:ip:${clientIp}`, `auth:ip_email:${clientIp}:${email}`];
    }
    return `auth:ip:${clientIp}`;
  },
});

// Dedicated password reset rate limiter: 5 requests per 15 minutes keyed on both (ip:email) and target email
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many password reset attempts. Please wait 15 minutes before trying again.',
  keyGenerator: (req, clientIp) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email) {
      return [`reset:ip_email:${clientIp}:${email}`, `reset:email:${email}`];
    }
    return `reset:ip:${clientIp}`;
  },
});
