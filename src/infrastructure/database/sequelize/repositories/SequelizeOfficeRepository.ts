import type { Transaction } from 'sequelize';
import type { OfficeRepository } from '../../../../application/ports/repositories/OfficeRepository.js';
import type { LicenseFields } from '../../../../domain/entities/License.js';
import type { Office, OfficeInput, OfficePatch } from '../../../../domain/entities/Office.js';
import { OfficeModel } from '../models/OfficeModel.js';

const toOffice = (m: OfficeModel): Office => ({
  id: m.id_office,
  code: m.code,
  name: m.name,
  status: m.status,
  expiresAt: m.expires_at ?? null,
  message: m.message?.trim() ? m.message.trim() : null,
  phone: m.phone ?? null,
  address: m.address ?? null,
  notes: m.notes ?? null,
  logoPath: m.logo_path ?? null,
  logoUpdatedAt: m.logo_updated_at ?? null,
  createdAt: m.created_at,
  updatedAt: m.updated_at,
});

export class SequelizeOfficeRepository implements OfficeRepository {
  constructor(private readonly transaction?: Transaction) {}

  private get options() {
    return this.transaction ? { transaction: this.transaction } : {};
  }

  async findByCode(code: string): Promise<Office | null> {
    const m = await OfficeModel.findOne({ where: { code }, ...this.options });
    return m ? toOffice(m) : null;
  }

  async findById(id: string): Promise<Office | null> {
    const m = await OfficeModel.findByPk(id, this.options);
    return m ? toOffice(m) : null;
  }

  async list(): Promise<Office[]> {
    const rows = await OfficeModel.findAll({ order: [['id_office', 'DESC']], ...this.options });
    return rows.map(toOffice);
  }

  async create(input: OfficeInput): Promise<Office> {
    const m = await OfficeModel.create(
      {
        code: input.code,
        name: input.name,
        status: input.status,
        expires_at: input.expiresAt,
        message: input.message,
        phone: input.phone,
        address: input.address,
        notes: input.notes,
        logo_path: input.logoPath ?? null,
        logo_updated_at: input.logoUpdatedAt ?? null,
      },
      this.options,
    );
    return toOffice(m);
  }

  async update(id: string, patch: OfficePatch): Promise<Office | null> {
    const values: Record<string, unknown> = {};
    if (patch.name !== undefined) values.name = patch.name;
    if (patch.status !== undefined) values.status = patch.status;
    if (patch.expiresAt !== undefined) values.expires_at = patch.expiresAt;
    if (patch.message !== undefined) values.message = patch.message;
    if (patch.phone !== undefined) values.phone = patch.phone;
    if (patch.address !== undefined) values.address = patch.address;
    if (patch.notes !== undefined) values.notes = patch.notes;
    if (patch.logoPath !== undefined) values.logo_path = patch.logoPath;
    if (patch.logoUpdatedAt !== undefined) values.logo_updated_at = patch.logoUpdatedAt;
    if (Object.keys(values).length > 0) await OfficeModel.update(values, { where: { id_office: id }, ...this.options });
    return this.findById(id);
  }

  async setCode(id: string, code: string): Promise<Office | null> {
    await OfficeModel.update({ code }, { where: { id_office: id }, ...this.options });
    return this.findById(id);
  }

  async licenseSnapshot(): Promise<Array<{ id: string } & LicenseFields>> {
    const rows = await OfficeModel.findAll({ attributes: ['id_office', 'status', 'expires_at', 'message'], ...this.options });
    return rows.map((m) => ({
      id: m.id_office,
      status: m.status,
      expiresAt: m.expires_at ?? null,
      message: m.message?.trim() ? m.message.trim() : null,
    }));
  }
}
