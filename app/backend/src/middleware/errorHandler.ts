import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { CONFIG } from '../config/environment';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  // If AppError or error has statusCode, use it; otherwise default to 500 Internal Server Error
  const statusCode = err instanceof AppError
    ? err.statusCode
    : typeof err.statusCode === 'number'
    ? err.statusCode
    : typeof err.status === 'number'
    ? err.status
    : 500;

  const isClientError = statusCode >= 400 && statusCode < 500;
  const message = (isClientError || CONFIG.NODE_ENV !== 'production')
    ? (err.message || 'An error occurred.')
    : 'Internal Server Error';

  console.error(`[${timestamp}] ERROR (${statusCode}): ${err.message || err}`);
  if (err.stack && (CONFIG.NODE_ENV !== 'production' || statusCode >= 500)) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    ok: false,
    error: message,
    timestamp,
    ...(CONFIG.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
  });
}