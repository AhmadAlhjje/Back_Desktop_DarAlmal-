import type { RequestHandler } from 'express';
import type { TokenService } from '../../../application/ports/services/TokenService.js';
import { ApplicationError } from '../../../application/errors/ApplicationError.js';
export const authenticate =
  (tokens: TokenService): RequestHandler =>
  (req, _res, next) => {
    try {
      const value = req.header('authorization');
      if (!value?.startsWith('Bearer ')) throw new ApplicationError('UNAUTHENTICATED', 'Authentication required', 401);
      req.auth = tokens.verify(value.slice(7));
      next();
    } catch {
      next(new ApplicationError('UNAUTHENTICATED', 'Invalid or expired token', 401));
    }
  };
export const authorize =
  (permission: string): RequestHandler =>
  (req, _res, next) => {
    if (req.auth?.role === 'ADMIN' || req.auth?.permissions.includes(permission)) return next();
    next(new ApplicationError('FORBIDDEN', 'Insufficient permission', 403));
  };
