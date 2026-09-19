import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Antigravity in-memory sliding-window rate limiter.
 * Protects against brute-force attacks and code enumeration with zero external dependencies.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message } = options;
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every 2 minutes
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  }, 120000);

  // Unref timer so it doesn't keep node process alive in tests
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow bypassing with test header if explicitly requested
    if (process.env.NODE_ENV === 'test' && req.headers['x-bypass-ratelimit']) {
      next();
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const routeKey = `${ip}:${req.baseUrl || ''}${req.path || ''}`;
    const now = Date.now();

    const existing = store.get(routeKey);

    if (!existing || now > existing.resetTime) {
      store.set(routeKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      next();
      return;
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.ceil((existing.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.status(429).json({
        ok: false,
        error: message || `Too many requests. Please wait ${retryAfterSeconds} seconds before retrying.`,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    existing.count += 1;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - existing.count));
    next();
  };
}
