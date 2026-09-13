import { QueryTypes, type Sequelize } from 'sequelize';
import type { BalanceAggregateRow, DailyPoint, ReportsRepository } from '../../../../application/ports/repositories/ReportsRepository.js';

interface RawAggregate {
  client_id: string | number;
  client_name: string;
  client_code: string;
  currency_id: string | number;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  exchange_rate: string;
  exchange_type: 'FROM_USD_MULTIPLY' | 'TO_USD_DIVIDE';
  total_us: string | null;
  total_them: string | null;
}

/** استعلامات تجميعية للتقارير (قراءة فقط، حركات POSTED فقط). */
export class SequelizeReportsRepository implements ReportsRepository {
  constructor(private readonly db: Sequelize) {}

  private static readonly BASE_SELECT = `
    SELECT c.id_client AS client_id, c.full_name AS client_name, c.client_code AS client_code,
           cu.id_currency AS currency_id, cu.currency_code, cu.currency_name, cu.currency_symbol,
           cu.decimal_places, cu.exchange_rate, cu.exchange_type,
           SUM(je.amount_us) AS total_us, SUM(je.amount_them) AS total_them
    FROM journal_entries je
    JOIN movements m ON m.id_movement = je.movement_id AND m.status = 'POSTED'
    JOIN clients c ON c.id_client = je.client_id
    JOIN currencies cu ON cu.id_currency = je.currency_id`;

  private static readonly GROUP_ORDER = `
    GROUP BY c.id_client, c.full_name, c.client_code, cu.id_currency, cu.currency_code, cu.currency_name,
             cu.currency_symbol, cu.decimal_places, cu.exchange_rate, cu.exchange_type
    ORDER BY c.importance DESC, c.full_name ASC, cu.importance DESC, cu.currency_code ASC`;

  private map(rows: RawAggregate[]): BalanceAggregateRow[] {
    return rows.map((r) => ({
      clientId: String(r.client_id),
      clientName: r.client_name,
      clientCode: r.client_code,
      currencyId: String(r.currency_id),
      currencyCode: r.currency_code,
      currencyName: r.currency_name,
      currencySymbol: r.currency_symbol,
      decimalPlaces: Number(r.decimal_places),
      exchangeRate: String(r.exchange_rate),
      exchangeType: r.exchange_type,
      totalUs: String(r.total_us ?? '0'),
      totalThem: String(r.total_them ?? '0'),
    }));
  }

  async clientBalances(clientId: string, asOf?: string): Promise<BalanceAggregateRow[]> {
    const rows = await this.db.query<RawAggregate>(
      `${SequelizeReportsRepository.BASE_SELECT}
       WHERE je.client_id = :clientId ${asOf ? 'AND m.created_at <= :asOf' : ''}
       ${SequelizeReportsRepository.GROUP_ORDER}`,
      { type: QueryTypes.SELECT, replacements: { clientId, asOf: asOf ? `${asOf} 23:59:59` : null } },
    );
    return this.map(rows);
  }

  async allBalances(filters: {
    asOf?: string;
    currencyId?: string;
    clientQuery?: string;
    includeSecret?: boolean;
  }): Promise<BalanceAggregateRow[]> {
    const conditions: string[] = ['1 = 1'];
    if (!filters.includeSecret) conditions.push('c.is_secret = 0');
    if (filters.asOf) conditions.push('m.created_at <= :asOf');
    if (filters.currencyId) conditions.push('je.currency_id = :currencyId');
    if (filters.clientQuery) conditions.push('(c.full_name LIKE :q OR c.client_code LIKE :q)');
    const rows = await this.db.query<RawAggregate>(
      `${SequelizeReportsRepository.BASE_SELECT}
       WHERE ${conditions.join(' AND ')}
       ${SequelizeReportsRepository.GROUP_ORDER}`,
      {
        type: QueryTypes.SELECT,
        replacements: {
          asOf: filters.asOf ? `${filters.asOf} 23:59:59` : null,
          currencyId: filters.currencyId ?? null,
          q: filters.clientQuery ? `%${filters.clientQuery}%` : null,
        },
      },
    );
    return this.map(rows);
  }

  async dayStats(date: string): Promise<{ count: number; totalResult: string }> {
    const rows = await this.db.query<{ c: string | number | null; r: string | null }>(
      `SELECT COUNT(*) AS c, COALESCE(SUM(total_result), 0) AS r FROM movements
       WHERE status = 'POSTED' AND created_at >= :from AND created_at <= :to`,
      { type: QueryTypes.SELECT, replacements: { from: `${date} 00:00:00`, to: `${date} 23:59:59` } },
    );
    return { count: Number(rows[0]?.c ?? 0), totalResult: String(rows[0]?.r ?? '0') };
  }

  async dailySeries(days: number): Promise<DailyPoint[]> {
    const rows = await this.db.query<{ d: string; c: string | number; r: string | null }>(
      `SELECT DATE(created_at) AS d, COUNT(*) AS c, COALESCE(SUM(total_result), 0) AS r FROM movements
       WHERE status = 'POSTED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
       GROUP BY DATE(created_at) ORDER BY d ASC`,
      { type: QueryTypes.SELECT, replacements: { days } },
    );
    return rows.map((r) => ({
      date: typeof r.d === 'string' ? r.d.slice(0, 10) : new Date(r.d).toISOString().slice(0, 10),
      count: Number(r.c),
      totalResult: String(r.r ?? '0'),
    }));
  }
}
