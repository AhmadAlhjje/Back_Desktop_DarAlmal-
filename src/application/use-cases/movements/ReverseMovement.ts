import { Decimal } from 'decimal.js';
import { MovementStatus } from '../../../domain/enums/MovementStatus.js';
import { ReceiptPaymentType } from '../../../domain/enums/ReceiptPaymentType.js';
import { ApplicationError } from '../../errors/ApplicationError.js';
import type { Clock } from '../../ports/services/Clock.js';
import type { UnitOfWork } from '../../ports/services/UnitOfWork.js';
import { AMOUNT_SCALE } from '../../../domain/value-objects/Precision.js';

/**
 * عكس الحركة **في مكانها** (قرار المستخدم 2026-09-15): لا تُنشأ حركة عكسية جديدة؛ تُقلب أطراف الحركة نفسها
 * بنفس الرقم (لنا ↔ علينا، من ↔ إلى، قبض ↔ دفع، اتجاه التصريف) وتبقى POSTED فتُحتسب بأثرها الجديد،
 * ويُوثَّق العكس بـ `reversedAt/reversedBy`. عكسها مرة أخرى يعيدها إلى اتجاهها الأصلي.
 * «الإلغاء» يبقى الوسيلة لإزالة أثر الحركة كلياً.
 */
export class ReverseMovement {
  constructor(
    private uow: UnitOfWork,
    private clock: Clock,
  ) {}
  execute(id: string, adminId: string) {
    return this.uow.execute(async (r) => {
      const original = await r.movementRepository.findById(id);
      if (!original) throw new ApplicationError('MOVEMENT_NOT_FOUND', 'Movement not found', 404);
      if (original.status !== MovementStatus.POSTED)
        throw new ApplicationError('MOVEMENT_NOT_POSTED', 'Only posted movements can be reversed', 409);
      const entries = await r.journalRepository.findByMovement(id);
      if (!entries.length)
        throw new ApplicationError('MOVEMENT_HAS_NO_JOURNAL', 'Posted movement has no journal entries', 409);
      const type = await r.movementTypeRepository.findById(original.movementTypeId);

      await r.journalRepository.flipSides(id);
      let movementTypeId = original.movementTypeId;
      let clientId = original.clientId;
      switch (type?.code) {
        case 'TRANSFER': {
          await r.transferRepository.swapSides(id);
          const swapped = await r.transferRepository.findByMovement(id);
          clientId = swapped?.fromClientId ?? clientId;
          break;
        }
        case 'EXCHANGE':
          await r.exchangeRepository.swapSides(id);
          break;
        case 'RECEIPT':
        case 'PAYMENT': {
          // قلب سند القبض يجعله سند دفع والعكس (الجهة الوحيدة انقلبت).
          const other = type.code === 'RECEIPT' ? ReceiptPaymentType.PAYMENT : ReceiptPaymentType.RECEIPT;
          const otherType = await r.movementTypeRepository.findByCode(other);
          if (!otherType?.isActive)
            throw new ApplicationError('MOVEMENT_TYPE_NOT_FOUND', `Active ${other} movement type not found`, 404);
          movementTypeId = otherType.id;
          await r.receiptPaymentRepository.setType(id, other);
          break;
        }
        default:
          break;
      }
      const nowReversed = !original.reversedAt;
      await r.movementRepository.updateContents(id, {
        movementTypeId,
        clientId,
        totalResult: new Decimal(original.totalResult).negated().toFixed(AMOUNT_SCALE),
        updatedBy: adminId,
        reversedAt: nowReversed ? this.clock.now() : null,
        reversedBy: nowReversed ? adminId : null,
      });
      const movement = (await r.movementRepository.findById(id))!;
      return { movement, reversed: nowReversed };
    });
  }
}
