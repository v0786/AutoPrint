import { Request, Response, NextFunction } from 'express';
import { MerchantRepository, MerchantRecord } from '../database/repositories/merchantRepository';

export interface AuthenticatedRequest extends Request {
  user?: MerchantRecord;
  token?: string;
}

/**
 * Enforces valid Bearer authentication token in the Authorization header.
 * Disallows insecure transmission via query strings to prevent token leakage in logs.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // If zero merchants exist in the database (uninitialized fresh install), allow initial setup
  if (MerchantRepository.getCount() === 0) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      ok: false,
      error: 'Authentication required. Bearer token must be provided in the Authorization header.',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token || token.length < 16) {
    res.status(401).json({
      ok: false,
      error: 'Invalid session token format.',
    });
    return;
  }

  const merchant = MerchantRepository.verifySession(token);
  if (!merchant) {
    res.status(401).json({
      ok: false,
      error: 'Session expired or invalid. Please log in again.',
    });
    return;
  }

  (req as AuthenticatedRequest).user = merchant;
  (req as AuthenticatedRequest).token = token;
  next();
}

/**
 * Enforces that the authenticated user possesses the 'admin' role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (MerchantRepository.getCount() === 0) {
    return next();
  }

  requireAuth(req, res, () => {
    const user = (req as AuthenticatedRequest).user;
    if (!user || user.role !== 'admin') {
      res.status(403).json({
        ok: false,
        error: 'Access denied: Administrator privileges required.',
      });
      return;
    }
    next();
  });
}

/**
 * Optional authentication: attaches user to request if valid Bearer token provided, but doesn't block if missing.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const merchant = MerchantRepository.verifySession(token);
      if (merchant) {
        (req as AuthenticatedRequest).user = merchant;
        (req as AuthenticatedRequest).token = token;
      }
    }
  }
  next();
}
