import type { PlatformNoticeRepository } from '../../../../application/ports/repositories/PlatformNoticeRepository.js';
import { NO_NOTICE, type PlatformNotice, type PlatformNoticeInput } from '../../../../domain/entities/PlatformNotice.js';
import { PlatformNoticeModel } from '../models/PlatformNoticeModel.js';

/** الصفّ الوحيد للإعلان — يُنشأ عند أول كتابة إن لم تُنشئه الهجرة. */
const ROW_ID = 1;

const toNotice = (m: PlatformNoticeModel): PlatformNotice => ({
  isActive: Boolean(m.is_active),
  title: m.title ?? null,
  message: m.message ?? '',
  updatedAt: m.updated_at ?? null,
});

export class SequelizePlatformNoticeRepository implements PlatformNoticeRepository {
  async get(): Promise<PlatformNotice> {
    const m = await PlatformNoticeModel.findByPk(ROW_ID);
    return m ? toNotice(m) : NO_NOTICE;
  }

  async set(input: PlatformNoticeInput): Promise<PlatformNotice> {
    const values = {
      id_notice: ROW_ID,
      is_active: input.isActive,
      title: input.title ?? null,
      message: input.message,
    };
    const existing = await PlatformNoticeModel.findByPk(ROW_ID);
    const m = existing ? await existing.update(values) : await PlatformNoticeModel.create(values);
    return toNotice(m);
  }
}
