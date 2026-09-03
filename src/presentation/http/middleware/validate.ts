import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
export const validate =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
export const validateQuery =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    try {
      resafe(req, schema.parse(req.query));
      next();
    } catch (error) {
      next(error);
    }
  };
function resafe(req: Parameters<RequestHandler>[0], value: unknown) {
  Object.defineProperty(req, 'validatedQuery', { value, configurable: true });
}
