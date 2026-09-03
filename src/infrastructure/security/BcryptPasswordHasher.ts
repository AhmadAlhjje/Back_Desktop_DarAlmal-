import bcrypt from 'bcrypt';
import type { PasswordHasher } from '../../application/ports/services/PasswordHasher.js';
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private rounds: number) {}
  hash(value: string) {
    return bcrypt.hash(value, this.rounds);
  }
  compare(value: string, hash: string) {
    return bcrypt.compare(value, hash);
  }
}
