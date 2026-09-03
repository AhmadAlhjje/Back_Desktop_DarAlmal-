export interface TokenPayload {
  adminId: string;
  role: string;
  permissions: string[];
}
export interface TokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
