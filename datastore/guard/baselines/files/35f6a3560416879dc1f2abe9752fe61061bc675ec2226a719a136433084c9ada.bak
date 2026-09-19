import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../types';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
        next(new AppError(`Validation failed: ${errorMessages}`, 422));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
        next(new AppError(`Query validation failed: ${errorMessages}`, 422));
      } else {
        next(error);
      }
    }
  };
}
