import { QueryTypes, type Transaction } from 'sequelize';
import type { OfficeStats, PlatformOverview, PlatformStatsRepository } from '../../../../application/ports/repositories/PlatformStatsRepository.js';
import { sequelize } from '../sequelize.js';

/** استعلامات خام مجمَّعة عبر كل المكاتب — للمنصّة فقط (خارج شبكة tenancy-hooks عمداً). */
export class SequelizePlatformStatsRepository implements PlatformStatsRepository {
  constructor(private readonly transaction?: Transaction) {}

  private get options() {
    return { type: QueryTypes.SELECT as const, ...(this.transaction ? { transaction: this.transaction } : {}) };
  }

  async statsFor(officeIds?: string[]): Promise<OfficeStats[]> {
    const filter = officeIds && officeIds.length > 0 ? 'WHERE o.id_office IN (:ids)' : '';
    const rows = (await sequelize.query(
      `SELECT o.id_office AS office_id,
              (SELECT COUNT(*) FROM admins a WHERE a.office_id = o.id_office) AS admins,
              (SELECT COUNT(*) FROM admins a WHERE a.office_id = o.id_office AND a.is_active = 1) AS active_admins,
              (SELECT COUNT(*) FROM clients c WHERE c.office_id = o.id_office AND c.is_system = 0) AS clients,
              (SELECT COUNT(*) FROM movements m WHERE m.office_id = o.id_office) AS movements,
              (SELECT COUNT(*) FROM movements m WHERE m.office_id = o.id_office AND m.created_at >= CURDATE()) AS movements_today,
              (SELECT MAX(m.created_at) FROM movements m WHERE m.office_id = o.id_office) AS last_movement_at
       FROM offices o ${filter}`,
      { ...this.options, replacements: { ids: officeIds ?? [] } },
    )) as Array<Record<string, string | number | Date | null>>;
    return rows.map((r) => ({
      officeId: String(r.office_id),
      admins: Number(r.admins ?? 0),
      activeAdmins: Number(r.active_admins ?? 0),
      clients: Number(r.clients ?? 0),
      movements: Number(r.movements ?? 0),
      movementsToday: Number(r.movements_today ?? 0),
      lastMovementAt: r.last_movement_at ? new Date(r.last_movement_at as string).toISOString() : null,
    }));
  }

  async overview(): Promise<PlatformOverview> {
    const [offices] = (await sequelize.query(
      `SELECT COUNT(*) AS total,
              SUM(status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > NOW())) AS active,
              SUM(status = 'SUSPENDED') AS suspended,
              SUM(status = 'EXPIRED' OR (status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= NOW())) AS expired
       FROM offices`,
      this.options,
    )) as Array<Record<string, string | number | null>>;
    const [totals] = (await sequelize.query(
      `SELECT (SELECT COUNT(*) FROM movements) AS movements,
              (SELECT COUNT(*) FROM movements WHERE created_at >= CURDATE()) AS movements_today,
              (SELECT COUNT(*) FROM clients WHERE is_system = 0) AS clients,
              (SELECT COUNT(*) FROM admins) AS admins`,
      this.options,
    )) as Array<Record<string, string | number | null>>;
    return {
      offices: {
        total: Number(offices?.total ?? 0),
        active: Number(offices?.active ?? 0),
        suspended: Number(offices?.suspended ?? 0),
        expired: Number(offices?.expired ?? 0),
      },
      movements: { total: Number(totals?.movements ?? 0), today: Number(totals?.movements_today ?? 0) },
      clients: Number(totals?.clients ?? 0),
      admins: Number(totals?.admins ?? 0),
    };
  }
}
