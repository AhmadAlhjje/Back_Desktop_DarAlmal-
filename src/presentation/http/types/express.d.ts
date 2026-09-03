import type { TokenPayload } from '../../../application/ports/services/TokenService.js';
declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
      validatedQuery?: any;
      requestId?: string;
    }
  }
}
export {};
