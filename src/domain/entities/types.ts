import type { AdminRole } from '../enums/AdminRole.js';
import type { EntrySide } from '../enums/EntrySide.js';
import type { MovementStatus } from '../enums/MovementStatus.js';
import type { ReceiptPaymentType } from '../enums/ReceiptPaymentType.js';

export interface Admin {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  passwordHash: string;
  role: AdminRole;
  permissions: string[] | null;
  isDeveloper: boolean;
  isActive: boolean;
}
export interface ClientGroup {
  id: string;
  name: string;
  description: string | null;
}
export interface Client {
  id: string;
  code: string;
  groupId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  importance: number;
}
export interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string | null;
  decimalPlaces: number;
  iconPath: string | null;
  textIcon: string | null;
  importance: number;
  exchangeRate: string;
  exchangeType: 'FROM_USD_MULTIPLY' | 'TO_USD_DIVIDE';
  isActive: boolean;
}
export interface MovementType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}
export interface Movement {
  id: string;
  movementNo: string;
  movementTypeId: string;
  clientId: string | null;
  description: string | null;
  movementDate: string;
  movementTime: string;
  totalResult: string;
  status: MovementStatus;
  createdBy: string;
  updatedBy: string | null;
}
export interface JournalEntry {
  id?: string;
  movementId: string;
  lineNo: number;
  clientId: string;
  currencyId: string;
  amount: string;
  side: EntrySide;
  exchangeRate: string | null;
  fees: string;
  feePercentage: string | null;
  description: string | null;
  movementDate: string;
  movementTime: string;
}
export interface Transfer {
  id?: string;
  movementId: string;
  statement: string | null;
  transferAmount: string;
  transferCurrencyId: string;
  fromClientId: string;
  fromCurrencyId: string;
  fromExchangeRate: string;
  feeUs: string;
  feeUsPercentage: string | null;
  totalUs: string;
  descriptionUs: string | null;
  toClientId: string;
  toCurrencyId: string;
  toExchangeRate: string;
  feeThem: string;
  feeThemPercentage: string | null;
  totalThem: string;
  descriptionThem: string | null;
}
export interface Exchange {
  id?: string;
  movementId: string;
  clientId: string;
  fromCurrencyId: string;
  fromAmount: string;
  toCurrencyId: string;
  toAmount: string;
  exchangeRate: string;
  totalUs: string;
  totalThem: string;
  profitLoss: string;
}
export interface ReceiptPayment {
  id?: string;
  movementId: string;
  type: ReceiptPaymentType;
  statement: string | null;
  clientId: string;
  currencyId: string;
  amount: string;
}
export interface Notification {
  id: string;
  adminId: string;
  title: string;
  message: string;
  type: string | null;
  movementId: string | null;
  isRead: boolean;
}
