import { randomBytes } from 'node:crypto';
import type { Clock } from '../../ports/services/Clock.js';
import type { Repositories } from '../../ports/repositories/types.js';
import { EntrySide } from '../../../domain/enums/EntrySide.js';

/**
 * معرّف الحركة/رقمها: 63 بت مرتّب زمنياً (41 بت ميلي ثانية + 22 بت عشوائي).
 * الجزء الزمني يجعل الترتيب «الأحدث أولاً» بالمعرّف مستقراً حتى للحركات المنشأة في الثانية نفسها
 * (مثل عكس حركة ثم إنشاء بديلها عند التعديل)، والجزء العشوائي يمنع التخمين والتصادم.
 */
export function newMovementId(now: number = Date.now()): string {
  const random = BigInt(`0x${randomBytes(4).toString('hex')}`) & 0x3fffffn;
  const value = ((BigInt(now) & 0x1ffffffffffn) << 22n) | random;
  return (value || 1n).toString();
}
export function movementTimestamp(clock: Clock) {
  const iso = clock.now().toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
}

/** عرض المبلغ بلا أصفار زائدة (5.0000 → 5، 12.50 → 12.5). */
export const trimAmount = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  const v = String(value);
  return (v.includes('.') ? v.replace(/\.?0+$/, '') : v) || '0';
};

/** تغيير واحد في حركة معدَّلة (للإشعار: «المبلغ: من 1000 إلى 1200»). */
export interface MovementChange {
  field: string;
  from: string;
  to: string;
}

const RECEIPT_PAYMENT_LABEL: Record<string, string> = { RECEIPT: 'سند قبض', PAYMENT: 'سند دفع' };

/**
 * وصف الحركة كخريطة «تسمية → قيمة» بالعربية (أسماء الحسابات والعملات لا معرّفاتها)
 * لمقارنة ما قبل التعديل بما بعده وصياغة إشعار «تعديل من كذا إلى كذا».
 */
export async function describeMovement(r: Repositories, movementId: string): Promise<Record<string, string>> {
  const movement = await r.movementRepository.findById(movementId);
  if (!movement) return {};
  const type = await r.movementTypeRepository.findById(movement.movementTypeId);
  const clientName = async (id: string | null | undefined) => (id ? ((await r.clientRepository.findById(id))?.fullName ?? id) : '—');
  const currencyName = async (id: string | null | undefined) => (id ? ((await r.currencyRepository.findById(id))?.name ?? id) : '—');
  const out: Record<string, string> = {};
  switch (type?.code) {
    case 'TRANSFER': {
      const t = await r.transferRepository.findByMovement(movementId);
      if (!t) break;
      out['المبلغ'] = trimAmount(t.transferAmount);
      out['عملة الحوالة'] = await currencyName(t.transferCurrencyId);
      out['من حساب'] = await clientName(t.fromClientId);
      out['عملة (من)'] = await currencyName(t.fromCurrencyId);
      out['سعر (من)'] = trimAmount(t.fromExchangeRate);
      out['أجور لنا'] = trimAmount(t.feeUs);
      out['إلى حساب'] = await clientName(t.toClientId);
      out['عملة (إلى)'] = await currencyName(t.toCurrencyId);
      out['سعر (إلى)'] = trimAmount(t.toExchangeRate);
      out['أجور علينا'] = trimAmount(t.feeThem);
      out['البيان'] = t.statement ?? '—';
      break;
    }
    case 'EXCHANGE': {
      const x = await r.exchangeRepository.findByMovement(movementId);
      if (!x) break;
      out['الحساب'] = await clientName(x.clientId);
      out['من عملة'] = await currencyName(x.fromCurrencyId);
      out['مبلغ علينا'] = trimAmount(x.totalThem);
      out['إلى عملة'] = await currencyName(x.toCurrencyId);
      out['مبلغ لنا'] = trimAmount(x.totalUs);
      out['سعر الصرف'] = trimAmount(x.exchangeRate);
      out['صندوق الأرباح'] = await clientName(x.profitLossClientId);
      out['البيان'] = movement.description ?? '—';
      break;
    }
    case 'RECEIPT':
    case 'PAYMENT': {
      const s = await r.receiptPaymentRepository.findByMovement(movementId);
      if (!s) break;
      out['النوع'] = RECEIPT_PAYMENT_LABEL[s.type] ?? s.type;
      out['الحساب'] = await clientName(s.clientId);
      out['العملة'] = await currencyName(s.currencyId);
      out['المبلغ'] = trimAmount(s.amount);
      out['البيان'] = s.statement ?? '—';
      break;
    }
    default: {
      const entries = await r.journalRepository.findByMovement(movementId);
      let i = 0;
      for (const e of entries) {
        i += 1;
        out[`الطرف ${i} — الحساب`] = await clientName(e.clientId);
        out[`الطرف ${i} — العملة`] = await currencyName(e.currencyId);
        out[`الطرف ${i} — المبلغ`] = trimAmount(e.amount);
        out[`الطرف ${i} — الجهة`] = e.side === EntrySide.US ? 'لنا' : 'علينا';
      }
      out['البيان'] = movement.description ?? '—';
    }
  }
  return out;
}

/** الفروق بين وصفين (قبل/بعد). */
export function diffDescriptions(before: Record<string, string>, after: Record<string, string>): MovementChange[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys
    .filter((k) => (before[k] ?? '—') !== (after[k] ?? '—'))
    .map((k) => ({ field: k, from: before[k] ?? '—', to: after[k] ?? '—' }));
}

/** نص الإشعار: «المبلغ: من 1000 إلى 1200؛ إلى حساب: من أحمد إلى باسل». */
export function formatChanges(changes: MovementChange[]): string {
  if (changes.length === 0) return 'بلا تغييرات فعلية';
  return changes.map((c) => `${c.field}: من ${c.from} إلى ${c.to}`).join('؛ ');
}
