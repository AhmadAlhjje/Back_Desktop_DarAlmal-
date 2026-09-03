import jwt from 'jsonwebtoken';
import type { TokenPayload, TokenService } from '../../application/ports/services/TokenService.js';
export class JwtTokenService implements TokenService {
  constructor(
    private secret: string,
    private expiresIn: jwt.SignOptions['expiresIn'],
  ) {}
  sign(payload: TokenPayload) {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }
  verify(token: string) {
    return jwt.verify(token, this.secret) as TokenPayload;
  }
}
