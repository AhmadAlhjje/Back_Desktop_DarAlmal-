export interface TokenPayload {
  adminId: string;
  role: string;
  permissions: string[];
  /** المكتب (المستأجر) الذي ينتمي إليه الإداري — يحدّد قاعدة كل طلب. */
  officeId: string;
  officeCode: string;
}
export interface TokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
