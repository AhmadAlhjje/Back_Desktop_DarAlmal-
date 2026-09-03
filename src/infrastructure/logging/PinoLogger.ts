import pino from 'pino';
import type { Logger } from '../../application/ports/services/Logger.js';
export class PinoLogger implements Logger {
  private readonly logger;
  constructor(level: string) {
    this.logger = pino({
      level,
      redact: {
        paths: ['password', 'passwordHash', 'password_hash', 'token', 'authorization', 'req.headers.authorization'],
        censor: '[REDACTED]',
      },
    });
  }
  info(data: object, message: string) {
    this.logger.info(data, message);
  }
  error(data: object, message: string) {
    this.logger.error(data, message);
  }
}
