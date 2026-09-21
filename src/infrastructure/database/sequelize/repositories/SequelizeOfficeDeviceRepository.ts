import type { OfficeDeviceRepository } from '../../../../application/ports/repositories/OfficeDeviceRepository.js';
import type { OfficeDevice, OfficeDeviceInput } from '../../../../domain/entities/OfficeDevice.js';
import { OfficeDeviceModel } from '../models/OfficeDeviceModel.js';

const toDevice = (m: OfficeDeviceModel): OfficeDevice => ({
  id: m.id_device,
  officeId: m.office_id,
  label: m.label ?? null,
  enrolledBy: m.enrolled_by ?? null,
  lastSeenAt: m.last_seen_at ?? null,
  revokedAt: m.revoked_at ?? null,
  createdAt: m.created_at,
});

export class SequelizeOfficeDeviceRepository implements OfficeDeviceRepository {
  async create(input: OfficeDeviceInput): Promise<OfficeDevice> {
    const m = await OfficeDeviceModel.create({
      office_id: input.officeId,
      key_hash: input.keyHash,
      label: input.label,
      enrolled_by: input.enrolledBy,
    });
    return toDevice(m);
  }

  async findActiveByKeyHash(keyHash: string): Promise<OfficeDevice | null> {
    const m = await OfficeDeviceModel.findOne({ where: { key_hash: keyHash, revoked_at: null } });
    return m ? toDevice(m) : null;
  }

  async listByOffice(officeId: string): Promise<OfficeDevice[]> {
    const rows = await OfficeDeviceModel.findAll({ where: { office_id: officeId }, order: [['id_device', 'DESC']] });
    return rows.map(toDevice);
  }

  async revoke(officeId: string, deviceId: string): Promise<OfficeDevice | null> {
    const m = await OfficeDeviceModel.findOne({ where: { id_device: deviceId, office_id: officeId } });
    if (!m) return null;
    if (!m.revoked_at) await m.update({ revoked_at: new Date() });
    return toDevice(m);
  }

  async touch(id: string, at: Date): Promise<void> {
    await OfficeDeviceModel.update({ last_seen_at: at }, { where: { id_device: id } });
  }
}
