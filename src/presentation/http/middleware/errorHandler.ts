import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../../../domain/errors/DomainError.js';
import { ApplicationError } from '../../../application/errors/ApplicationError.js';
import type { Logger } from '../../../application/ports/services/Logger.js';
export const errorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (error, req, res, _next) => {
    if (error instanceof ZodError)
      return void res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.flatten() },
      });
    if (error instanceof ApplicationError)
      return void res
        .status(error.status)
        .json({ success: false, error: { code: error.code, message: error.message, details: error.details } });
    if (error instanceof DomainError)
      return void res
        .status(422)
        .json({ success: false, error: { code: error.code, message: error.message, details: null } });
    logger.error(
      {
        requestId: req.requestId,
        adminId: req.auth?.adminId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
      'Unhandled request error',
    );
    return void res
      .status(500)
      .json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: null } });
  };
