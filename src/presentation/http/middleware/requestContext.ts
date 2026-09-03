import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from '../../../application/ports/services/Logger.js';
export const requestContext =
  (logger: Logger): RequestHandler =>
  (req, res, next) => {
    const startedAt = Date.now();
    req.requestId = req.header('x-request-id')?.slice(0, 100) || randomUUID();
    res.setHeader('x-request-id', req.requestId);
    res.on('finish', () =>
      logger.info(
        {
          requestId: req.requestId,
          adminId: req.auth?.adminId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        },
        'HTTP request completed',
      ),
    );
    next();
  };
