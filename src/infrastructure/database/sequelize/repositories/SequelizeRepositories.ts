import { fn, col, literal, Op, type Transaction, type WhereOptions } from 'sequelize';
import { sequelize } from '../sequelize.js';

/** تهريب قيمة نصية للاستخدام داخل `literal` (يُنتج نصاً مقتبساً آمناً). */
const sequelizeEscape = (value: string): string => sequelize.escape(value);
import { Decimal } from 'decimal.js';
import type { Repositories } from '../../../../application/ports/repositories/types.js';
import { AdminMapper } from '../mappers/AdminMapper.js';
import { ClientMapper } from '../mappers/ClientMapper.js';
import { CurrencyMapper } from '../mappers/CurrencyMapper.js';
import { MovementMapper } from '../mappers/MovementMapper.js';
import {
  AdminModel,
  ClientGroupModel,
  ClientModel,
  CurrencyModel,
  ExchangeMovementModel,
  JournalEntryModel,
  MovementModel,
  MovementTypeModel,
  NotificationModel,
  SettlementMovementModel,
  TransferMovementModel,
} from '../models/index.js';
import type { MovementStatus } from '../../../../domain/enums/MovementStatus.js';
import { EntrySide } from '../../../../domain/enums/EntrySide.js';
import type { Logger } from '../../../../application/ports/services/Logger.js';
import { mapDatabaseError } from '../DatabaseErrorMapper.js';
import { AMOUNT_SCALE, ZERO_AMOUNT, isZeroAmount } from '../../../../domain/value-objects/Precision.js';

export function createRepositories(transaction?: Transaction, logger?: Logger): Repositories {
  const options = transaction ? { transaction } : {};
  const journalInclude = (movementWhere: Record<string, unknown> = {}) => [
    {
      model: MovementModel,
      as: 'movement',
      required: true,
      attributes: ['movement_no', 'movement_type_id', 'status', 'created_at', 'created_by'],
      where: movementWhere,
      include: [
        { model: MovementTypeModel, as: 'movementType', attributes: ['movement_code'] },
        { model: AdminModel, as: 'creator', attributes: ['id_admin', 'full_name'], required: false },
      ],
    },
  ];
  const journalWhere = (
    f: import('../../../../application/ports/repositories/types.js').JournalFilters,
  ): WhereOptions => ({
    ...(f.clientId && { client_id: f.clientId }),
    ...(f.currencyId && { currency_id: f.currencyId }),
    ...(f.entrySide === 'US' && { amount_us: { [Op.gt]: 0 } }),
    ...(f.entrySide === 'THEM' && { amount_them: { [Op.gt]: 0 } }),
  });
  const movementWhere = (f: import('../../../../application/ports/repositories/types.js').JournalFilters) => ({
    ...(f.movementTypeId && { movement_type_id: f.movementTypeId }),
    ...(f.movementNo && { movement_no: f.movementNo }),
    ...(f.status && { status: f.status }),
    ...((f.dateFrom || f.dateTo) && {
      created_at: {
        ...(f.dateFrom && { [Op.gte]: `${f.dateFrom} 00:00:00` }),
        ...(f.dateTo && { [Op.lte]: `${f.dateTo} 23:59:59` }),
      },
    }),
  });
  /** شروط سجل الحركات؛ `alias` هو اسم جدول الحركات في الاستعلام (MovementModel أو movement). */
  const movementListWhere = (
    f: import('../../../../application/ports/repositories/types.js').MovementListFilters,
    alias: string,
  ): WhereOptions => {
    const esc = (v: string) => sequelizeEscape(`%${v}%`);
    const and: WhereOptions[] = [];
    if (f.movementTypeId) and.push({ movement_type_id: f.movementTypeId });
    if (f.status) and.push({ status: f.status });
    if (f.movementNo) and.push({ movement_no: f.movementNo });
    if (f.createdBy) and.push({ created_by: f.createdBy });
    if (f.dateFrom || f.dateTo)
      and.push({
        created_at: {
          ...(f.dateFrom && { [Op.gte]: `${f.dateFrom} 00:00:00` }),
          ...(f.dateTo && { [Op.lte]: `${f.dateTo} 23:59:59` }),
        },
      });
    if (f.clientId)
      and.push(
        literal(
          `EXISTS (SELECT 1 FROM journal_entries je WHERE je.movement_id = \`${alias}\`.\`id_movement\` AND je.client_id = ${sequelizeEscape(f.clientId)})`,
        ),
      );
    if (f.currencyId)
      and.push(
        literal(
          `EXISTS (SELECT 1 FROM journal_entries jec WHERE jec.movement_id = \`${alias}\`.\`id_movement\` AND jec.currency_id = ${sequelizeEscape(f.currencyId)})`,
        ),
      );
    if (f.q && f.q.trim()) {
      const like = esc(f.q.trim());
      const noMatch = /^\d+$/.test(f.q.trim()) ? ` OR \`${alias}\`.\`movement_no\` = ${sequelizeEscape(f.q.trim())}` : '';
      and.push(
        literal(
          `(EXISTS (SELECT 1 FROM journal_entries je JOIN clients c ON c.id_client = je.client_id JOIN currencies cu ON cu.id_currency = je.currency_id WHERE je.movement_id = \`${alias}\`.\`id_movement\` AND (c.full_name LIKE ${like} OR cu.currency_name LIKE ${like} OR cu.currency_code LIKE ${like} OR je.description LIKE ${like}))` +
            ` OR EXISTS (SELECT 1 FROM admins a WHERE a.id_admin = \`${alias}\`.\`created_by\` AND a.full_name LIKE ${like})` +
            ` OR EXISTS (SELECT 1 FROM movement_types mt WHERE mt.id_movement_type = \`${alias}\`.\`movement_type_id\` AND mt.movement_name LIKE ${like})` +
            ` OR EXISTS (SELECT 1 FROM transfer_movements t WHERE t.movement_id = \`${alias}\`.\`id_movement\` AND t.statement LIKE ${like})` +
            ` OR EXISTS (SELECT 1 FROM exchange_movements x WHERE x.movement_id = \`${alias}\`.\`id_movement\` AND x.statement LIKE ${like})` +
            ` OR EXISTS (SELECT 1 FROM settlement_movements s WHERE s.movement_id = \`${alias}\`.\`id_movement\` AND s.statement LIKE ${like})` +
            noMatch +
            `)`,
        ),
      );
    }
    return and.length === 0 ? {} : { [Op.and]: and };
  };
  const toJournalItem = (
    row: JournalEntryModel,
  ): import('../../../../application/ports/repositories/types.js').JournalItem => {
    const movement = row.get('movement') as MovementModel;
    const type = movement.get('movementType') as MovementTypeModel;
    const creator = movement.get('creator') as AdminModel | null | undefined;
    return {
      id: row.id_day,
      movementId: row.movement_id,
      movementNo: movement.movement_no,
      movementTypeId: movement.movement_type_id,
      movementTypeCode: type.movement_code,
      movementStatus: movement.status,
      createdById: movement.created_by,
      createdByName: creator?.full_name ?? null,
      lineNo: Number(row.id_day),
      clientId: row.client_id,
      currencyId: row.currency_id,
      amount: !isZeroAmount(row.amount_us) ? row.amount_us : row.amount_them,
      side: !isZeroAmount(row.amount_us) ? EntrySide.US : EntrySide.THEM,
      exchangeRate: null,
      fees: ZERO_AMOUNT,
      feePercentage: null,
      description: row.description,
      movementDate: movement.created_at.toISOString().slice(0, 10),
      movementTime: row.movement_time,
    };
  };
  const sideTotals = async (where: WhereOptions, movementFilter: Record<string, unknown> = { status: 'POSTED' }) => {
    const rows = (await JournalEntryModel.findAll({
      attributes: [
        [fn('SUM', col('amount_us')), 'us'],
        [fn('SUM', col('amount_them')), 'them'],
      ],
      where,
      include: [{ model: MovementModel, as: 'movement', required: true, attributes: [], where: movementFilter }],
      raw: true,
      ...options,
    })) as unknown as Array<{ us: string | null; them: string | null }>;
    return { us: String(rows[0]?.us ?? '0'), them: String(rows[0]?.them ?? '0') };
  };
  const repositories: Repositories = {
    adminRepository: {
      async findById(id) {
        const row = await AdminModel.findByPk(id, options);
        return row ? AdminMapper.toDomain(row) : null;
      },
      async findAllActive() {
        const rows = await AdminModel.findAll({ where: { is_active: true }, order: [['id_admin', 'ASC']], ...options });
        return rows.map((m) => AdminMapper.toDomain(m));
      },
      async findByFullName(fullName) {
        const row = await AdminModel.findOne({ where: { full_name: fullName }, ...options });
        return row ? AdminMapper.toDomain(row) : null;
      },
      async findPage(page, limit) {
        const r = await AdminModel.findAndCountAll({
          order: [['id_admin', 'DESC']],
          offset: (page - 1) * limit,
          limit,
          ...options,
        });
        return { count: r.count, rows: r.rows.map(AdminMapper.toDomain) };
      },
      async create(i) {
        const m = await AdminModel.create(
          {
            full_name: i.fullName,
            phone: i.phone,
            email: i.email,
            password_hash: i.passwordHash,
            role: i.role,
            permissions: i.permissions,
            is_developer: i.isDeveloper,
            is_active: i.isActive,
          },
          options,
        );
        return AdminMapper.toDomain(m);
      },
      async update(id, i) {
        const data = {
          ...(i.fullName !== undefined && { full_name: i.fullName }),
          ...(i.phone !== undefined && { phone: i.phone }),
          ...(i.email !== undefined && { email: i.email }),
          ...(i.passwordHash !== undefined && { password_hash: i.passwordHash }),
          ...(i.role !== undefined && { role: i.role }),
          ...(i.permissions !== undefined && { permissions: i.permissions }),
          ...(i.isDeveloper !== undefined && { is_developer: i.isDeveloper }),
          ...(i.isActive !== undefined && { is_active: i.isActive }),
        };
        const [count] = await AdminModel.update(data, { where: { id_admin: id }, ...options });
        if (!count) return null;
        const m = await AdminModel.findByPk(id, options);
        return m ? AdminMapper.toDomain(m) : null;
      },
    },
    clientGroupRepository: {
      async findById(id) {
        const m = await ClientGroupModel.findByPk(id, options);
        return m ? { id: m.id_group, name: m.group_name, description: m.description } : null;
      },
      async findPage(page, limit) {
        const r = await ClientGroupModel.findAndCountAll({
          attributes: {
            include: [
              [
                literal('(SELECT COUNT(*) FROM clients c WHERE c.group_id = `ClientGroupModel`.`id_group`)'),
                'clients_count',
              ],
            ],
          },
          order: [['id_group', 'DESC']],
          offset: (page - 1) * limit,
          limit,
          ...options,
        });
        return {
          count: r.count,
          rows: r.rows.map((m) => ({
            id: m.id_group,
            name: m.group_name,
            description: m.description,
            clientsCount: Number(m.get('clients_count') ?? 0),
          })),
        };
      },
      async countClients(id) {
        return ClientModel.count({ where: { group_id: id }, ...options });
      },
      async delete(id) {
        const count = await ClientGroupModel.destroy({ where: { id_group: id }, ...options });
        return count > 0;
      },
      async create(i) {
        const m = await ClientGroupModel.create({ group_name: i.name, description: i.description }, options);
        return { id: m.id_group, ...i };
      },
      async update(id, i) {
        const data = {
          ...(i.name !== undefined && { group_name: i.name }),
          ...(i.description !== undefined && { description: i.description }),
        };
        const [count] = await ClientGroupModel.update(data, { where: { id_group: id }, ...options });
        if (!count) return null;
        const m = await ClientGroupModel.findByPk(id, options);
        return m ? { id: m.id_group, name: m.group_name, description: m.description } : null;
      },
    },
    clientRepository: {
      async findById(id) {
        const row = await ClientModel.findByPk(id, options);
        return row ? ClientMapper.toDomain(row) : null;
      },
      async findPage(page, limit, filters = {}) {
        const where: WhereOptions = {
          archived_at: filters.archived ? { [Op.ne]: null } : null,
          ...(filters.includeSecret ? {} : { is_secret: false }),
        };
        const r = await ClientModel.findAndCountAll({
          where,
          attributes: {
            include: [
              [
                literal(
                  '(SELECT COUNT(DISTINCT je.movement_id) FROM journal_entries je JOIN movements mv ON mv.id_movement = je.movement_id WHERE je.client_id = `ClientModel`.`id_client` AND mv.status = \'POSTED\')',
                ),
                'movements_count',
              ],
            ],
          },
          include: [{ model: ClientGroupModel, as: 'group', attributes: ['group_name'], required: false }],
          order: [['id_client', 'DESC']],
          offset: (page - 1) * limit,
          limit,
          distinct: true,
          ...options,
        });
        return {
          count: r.count,
          rows: r.rows.map((m) => {
            const group = m.get('group') as ClientGroupModel | null;
            return {
              ...ClientMapper.toDomain(m),
              groupName: group?.group_name ?? null,
              movementsCount: Number(m.get('movements_count') ?? 0),
            };
          }),
        };
      },
      async create(input) {
        const row = await ClientModel.create(
          {
            client_code: input.code,
            group_id: input.groupId,
            full_name: input.fullName,
            phone: input.phone,
            email: input.email,
            address: input.address,
            importance: input.importance,
            account_type: input.accountType ?? 'CLIENT',
          },
          options,
        );
        return ClientMapper.toDomain(row);
      },
      async findCashBox() {
        const row = await ClientModel.findOne({ where: { is_cash_box: true, archived_at: null }, ...options });
        return row ? ClientMapper.toDomain(row) : null;
      },
      async update(id, i) {
        const data = {
          ...(i.code !== undefined && { client_code: i.code }),
          ...(i.groupId !== undefined && { group_id: i.groupId }),
          ...(i.fullName !== undefined && { full_name: i.fullName }),
          ...(i.phone !== undefined && { phone: i.phone }),
          ...(i.email !== undefined && { email: i.email }),
          ...(i.address !== undefined && { address: i.address }),
          ...(i.importance !== undefined && { importance: i.importance }),
          ...(i.accountType !== undefined && { account_type: i.accountType }),
        };
        const [count] = await ClientModel.update(data, { where: { id_client: id }, ...options });
        if (!count) return null;
        const m = await ClientModel.findByPk(id, options);
        return m ? ClientMapper.toDomain(m) : null;
      },
      async setCashBox(id) {
        const target = await ClientModel.findByPk(id, options);
        if (!target) return null;
        await ClientModel.update({ is_cash_box: false }, { where: { is_cash_box: true }, ...options });
        await ClientModel.update({ is_cash_box: true }, { where: { id_client: id }, ...options });
        const m = await ClientModel.findByPk(id, options);
        return m ? ClientMapper.toDomain(m) : null;
      },
      async setSecret(id, isSecret) {
        const [count] = await ClientModel.update({ is_secret: isSecret }, { where: { id_client: id }, ...options });
        if (!count) return null;
        const m = await ClientModel.findByPk(id, options);
        return m ? ClientMapper.toDomain(m) : null;
      },
      async setArchived(id, archivedAt) {
        const [count] = await ClientModel.update(
          { archived_at: archivedAt, ...(archivedAt ? { is_cash_box: false } : {}) },
          { where: { id_client: id }, ...options },
        );
        if (!count) return null;
        const m = await ClientModel.findByPk(id, options);
        return m ? ClientMapper.toDomain(m) : null;
      },
      async setLastRollover(id, at) {
        const [count] = await ClientModel.update({ last_rollover_at: at }, { where: { id_client: id }, ...options });
        if (!count) return null;
        const m = await ClientModel.findByPk(id, options);
        return m ? ClientMapper.toDomain(m) : null;
      },
      async countJournalEntries(id) {
        return JournalEntryModel.count({ where: { client_id: id }, ...options });
      },
      async delete(id) {
        const count = await ClientModel.destroy({ where: { id_client: id }, ...options });
        return count > 0;
      },
    },
    currencyRepository: {
      async findById(id) {
        const row = await CurrencyModel.findByPk(id, options);
        return row ? CurrencyMapper.toDomain(row) : null;
      },
      async findPage(page, limit) {
        const r = await CurrencyModel.findAndCountAll({
          order: [['id_currency', 'DESC']],
          offset: (page - 1) * limit,
          limit,
          ...options,
        });
        return { count: r.count, rows: r.rows.map(CurrencyMapper.toDomain) };
      },
      async create(i) {
        const m = await CurrencyModel.create(
          {
            currency_name: i.name,
            currency_code: i.code,
            currency_symbol: i.symbol,
            decimal_places: i.decimalPlaces,
            icon_path: i.iconPath,
            text_icon: i.textIcon,
            importance: i.importance,
            exchange_rate: i.exchangeRate,
            exchange_type: i.exchangeType,
            is_active: i.isActive,
          },
          options,
        );
        return CurrencyMapper.toDomain(m);
      },
      async update(id, i) {
        const data = {
          ...(i.name !== undefined && { currency_name: i.name }),
          ...(i.code !== undefined && { currency_code: i.code }),
          ...(i.symbol !== undefined && { currency_symbol: i.symbol }),
          ...(i.decimalPlaces !== undefined && { decimal_places: i.decimalPlaces }),
          ...(i.iconPath !== undefined && { icon_path: i.iconPath }),
          ...(i.textIcon !== undefined && { text_icon: i.textIcon }),
          ...(i.importance !== undefined && { importance: i.importance }),
          ...(i.exchangeRate !== undefined && { exchange_rate: i.exchangeRate }),
          ...(i.exchangeType !== undefined && { exchange_type: i.exchangeType }),
          ...(i.isActive !== undefined && { is_active: i.isActive }),
        };
        const [count] = await CurrencyModel.update(data, { where: { id_currency: id }, ...options });
        if (!count) return null;
        const m = await CurrencyModel.findByPk(id, options);
        return m ? CurrencyMapper.toDomain(m) : null;
      },
    },
    movementTypeRepository: {
      async findByCode(code) {
        const m = await MovementTypeModel.findOne({ where: { movement_code: code }, ...options });
        return m
          ? {
              id: m.id_movement_type,
              code: m.movement_code,
              name: m.movement_name,
              description: m.description,
              isActive: m.is_active,
            }
          : null;
      },
      async findPage(page, limit) {
        const r = await MovementTypeModel.findAndCountAll({
          order: [['id_movement_type', 'ASC']],
          offset: (page - 1) * limit,
          limit,
          ...options,
        });
        return {
          count: r.count,
          rows: r.rows.map((m) => ({
            id: m.id_movement_type,
            code: m.movement_code,
            name: m.movement_name,
            description: m.description,
            isActive: m.is_active,
          })),
        };
      },
      async update(id, i) {
        const data = {
          ...(i.name !== undefined && { movement_name: i.name }),
          ...(i.description !== undefined && { description: i.description }),
          ...(i.isActive !== undefined && { is_active: i.isActive }),
        };
        const [count] = await MovementTypeModel.update(data, { where: { id_movement_type: id }, ...options });
        if (!count) return null;
        const m = await MovementTypeModel.findByPk(id, options);
        return m
          ? {
              id: m.id_movement_type,
              code: m.movement_code,
              name: m.movement_name,
              description: m.description,
              isActive: m.is_active,
            }
          : null;
      },
    },
    movementRepository: {
      async create(input) {
        const row = await MovementModel.create(
          {
            id_movement: input.id,
            movement_no: input.movementNo,
            movement_type_id: input.movementTypeId,
            client_id: input.clientId,
            movement_time: input.movementTime,
            total_result: input.totalResult,
            status: input.status as MovementStatus,
            created_by: input.createdBy,
            updated_by: input.updatedBy,
          },
          options,
        );
        return MovementMapper.toDomain(row);
      },
      async findById(id) {
        const row = await MovementModel.findByPk(id, options);
        return row ? MovementMapper.toDomain(row) : null;
      },
      async findDetails(id) {
        const row = await MovementModel.findByPk(id, {
          include: [
            { model: MovementTypeModel, as: 'movementType' },
            { model: AdminModel, as: 'creator' },
            { model: AdminModel, as: 'updater' },
            { model: JournalEntryModel, as: 'journalEntries' },
            { model: TransferMovementModel, as: 'transferDetail' },
            { model: ExchangeMovementModel, as: 'exchangeDetail' },
            { model: SettlementMovementModel, as: 'receiptPaymentDetail' },
          ],
          ...options,
        });
        if (!row) return null;
        const type = row.get('movementType') as MovementTypeModel;
        const creator = AdminMapper.toDomain(row.get('creator') as AdminModel);
        const updaterRow = row.get('updater') as AdminModel | null;
        const { passwordHash: _creatorHash, ...safeCreator } = creator;
        const safeUpdater = updaterRow
          ? (() => {
              const { passwordHash: _hash, ...safe } = AdminMapper.toDomain(updaterRow);
              return safe;
            })()
          : null;
        const detailModel = row.get('transferDetail') ?? row.get('exchangeDetail') ?? row.get('receiptPaymentDetail');
        return {
          movement: MovementMapper.toDomain(row),
          movementType: {
            id: type.id_movement_type,
            code: type.movement_code,
            name: type.movement_name,
            description: type.description,
            isActive: type.is_active,
          },
          createdBy: safeCreator,
          updatedBy: safeUpdater,
          detail: detailModel
            ? ((detailModel as import('sequelize').Model).get({ plain: true }) as Record<string, unknown>)
            : null,
          journalEntries: ((row.get('journalEntries') as JournalEntryModel[]) ?? [])
            .sort((a, b) => Number(a.id_day) - Number(b.id_day))
            .map((e) => ({
              id: e.id_day,
              movementId: e.movement_id,
              lineNo: Number(e.id_day),
              clientId: e.client_id,
              currencyId: e.currency_id,
              amount: !isZeroAmount(e.amount_us) ? e.amount_us : e.amount_them,
              side: !isZeroAmount(e.amount_us) ? EntrySide.US : EntrySide.THEM,
              exchangeRate: null,
              fees: ZERO_AMOUNT,
              feePercentage: null,
              description: e.description,
              movementDate: row.created_at.toISOString().slice(0, 10),
              movementTime: e.movement_time,
            })),
        };
      },
      async findListPage(filters) {
        const where = movementListWhere(filters, 'MovementModel');
        const result = await MovementModel.findAndCountAll({
          where,
          include: [
            { model: MovementTypeModel, as: 'movementType', attributes: ['id_movement_type', 'movement_code', 'movement_name'] },
            { model: AdminModel, as: 'creator', attributes: ['id_admin', 'full_name'] },
            {
              model: JournalEntryModel,
              as: 'journalEntries',
              attributes: ['id_day', 'client_id', 'currency_id', 'amount_us', 'amount_them', 'description'],
              include: [
                { model: ClientModel, as: 'client', attributes: ['full_name'] },
                { model: CurrencyModel, as: 'currency', attributes: ['currency_code', 'currency_name', 'decimal_places'] },
              ],
            },
            { model: TransferMovementModel, as: 'transferDetail', attributes: ['statement'] },
            { model: ExchangeMovementModel, as: 'exchangeDetail', attributes: ['statement'] },
            { model: SettlementMovementModel, as: 'receiptPaymentDetail', attributes: ['statement'] },
          ],
          order: [
            ['created_at', 'DESC'],
            ['id_movement', 'DESC'],
            [{ model: JournalEntryModel, as: 'journalEntries' }, 'id_day', 'ASC'],
          ],
          offset: (filters.page - 1) * filters.limit,
          limit: filters.limit,
          distinct: true,
          subQuery: false,
          ...options,
        });
        const totals = (await MovementModel.findAll({
          attributes: [
            [fn('COUNT', col('id_movement')), 'c'],
            [fn('SUM', col('total_result')), 'r'],
          ],
          where,
          raw: true,
          ...options,
        })) as unknown as Array<{ c: string | number | null; r: string | null }>;
        const sides = (await JournalEntryModel.findAll({
          attributes: [
            [fn('SUM', col('amount_us')), 'us'],
            [fn('SUM', col('amount_them')), 'them'],
          ],
          include: [
            { model: MovementModel, as: 'movement', attributes: [], required: true, where: movementListWhere(filters, 'movement') },
          ],
          raw: true,
          ...options,
        })) as unknown as Array<{ us: string | null; them: string | null }>;
        return {
          count: result.count,
          rows: result.rows.map((row) => {
            const type = row.get('movementType') as MovementTypeModel;
            const creator = row.get('creator') as AdminModel;
            const entries = ((row.get('journalEntries') as JournalEntryModel[]) ?? []).map((e) => {
              const client = e.get('client') as ClientModel | null;
              const currency = e.get('currency') as CurrencyModel | null;
              return {
                id: e.id_day,
                clientId: e.client_id,
                clientName: client?.full_name ?? '',
                currencyId: e.currency_id,
                currencyCode: currency?.currency_code ?? '',
                currencyName: currency?.currency_name ?? '',
                decimalPlaces: currency?.decimal_places ?? 2,
                amountUs: e.amount_us,
                amountThem: e.amount_them,
                description: e.description,
              };
            });
            const detailStatement =
              (row.get('transferDetail') as TransferMovementModel | null)?.statement ??
              (row.get('exchangeDetail') as ExchangeMovementModel | null)?.statement ??
              (row.get('receiptPaymentDetail') as SettlementMovementModel | null)?.statement ??
              null;
            return {
              id: row.id_movement,
              movementNo: row.movement_no,
              movementType: { id: type.id_movement_type, code: type.movement_code, name: type.movement_name },
              status: row.status as MovementStatus,
              movementDate: row.created_at.toISOString().slice(0, 10),
              movementTime: row.movement_time,
              createdAt: row.created_at.toISOString(),
              totalResult: row.total_result,
              statement: detailStatement ?? entries.find((e) => e.description)?.description ?? null,
              createdBy: { id: creator.id_admin, fullName: creator.full_name },
              entries,
            };
          }),
          summary: {
            count: Number(totals[0]?.c ?? 0),
            totalResult: String(totals[0]?.r ?? '0'),
            totalUs: String(sides[0]?.us ?? '0'),
            totalThem: String(sides[0]?.them ?? '0'),
          },
        };
      },
      async updateResult(id, result) {
        await MovementModel.update({ total_result: result }, { where: { id_movement: id }, ...options });
      },
      async updateStatus(id, status, updatedBy) {
        await MovementModel.update({ status, updated_by: updatedBy }, { where: { id_movement: id }, ...options });
      },
    },
    journalRepository: {
      async createMany(entries) {
        await JournalEntryModel.bulkCreate(
          entries.map((e) => ({
            movement_id: e.movementId,
            client_id: e.clientId,
            currency_id: e.currencyId,
            amount_us: e.side === EntrySide.US ? e.amount : ZERO_AMOUNT,
            amount_them: e.side === EntrySide.THEM ? e.amount : ZERO_AMOUNT,
            description: e.description,
            movement_time: e.movementTime,
          })),
          options,
        );
      },
      async findByMovement(movementId) {
        const rows = await JournalEntryModel.findAll({
          where: { movement_id: movementId },
          order: [['id_day', 'ASC']],
          ...options,
        });
        return rows.map((e) => ({
          id: e.id_day,
          movementId: e.movement_id,
          lineNo: Number(e.id_day),
          clientId: e.client_id,
          currencyId: e.currency_id,
          amount: !isZeroAmount(e.amount_us) ? e.amount_us : e.amount_them,
          side: !isZeroAmount(e.amount_us) ? EntrySide.US : EntrySide.THEM,
          exchangeRate: null,
          fees: ZERO_AMOUNT,
          feePercentage: null,
          description: e.description,
          movementDate: e.created_at.toISOString().slice(0, 10),
          movementTime: e.movement_time,
        }));
      },
      async findPage(filters) {
        const result = await JournalEntryModel.findAndCountAll({
          where: journalWhere(filters),
          include: journalInclude(movementWhere(filters)),
          order: [
            [{ model: MovementModel, as: 'movement' }, 'created_at', 'DESC'],
            ['id_day', 'DESC'],
          ],
          offset: (filters.page - 1) * filters.limit,
          limit: filters.limit,
          distinct: true,
          ...options,
        });
        return { rows: result.rows.map(toJournalItem), count: result.count };
      },
      async findStatementPage(filters) {
        const periodWhere = journalWhere(filters);
        const statementMovementWhere = {
          status: 'POSTED',
          ...(filters.movementTypeId && { movement_type_id: filters.movementTypeId }),
          ...((filters.dateFrom || filters.dateTo) && {
            created_at: {
              ...(filters.dateFrom && { [Op.gte]: `${filters.dateFrom} 00:00:00` }),
              ...(filters.dateTo && { [Op.lte]: `${filters.dateTo} 23:59:59` }),
            },
          }),
        };
        // الأحدث أولاً؛ الرصيد الجاري يُحسب في use case انطلاقاً من الختامي نزولاً.
        const page = await JournalEntryModel.findAndCountAll({
          where: periodWhere,
          include: journalInclude(statementMovementWhere),
          order: [
            [{ model: MovementModel, as: 'movement' }, 'created_at', 'DESC'],
            ['id_day', 'DESC'],
          ],
          offset: (filters.page - 1) * filters.limit,
          limit: filters.limit,
          distinct: true,
          ...options,
        });
        const opening = filters.dateFrom
          ? await sideTotals(
              { client_id: filters.clientId, currency_id: filters.currencyId },
              { status: 'POSTED', created_at: { [Op.lt]: `${filters.dateFrom} 00:00:00` } },
            )
          : { us: '0', them: '0' };
        let beforePage = { us: '0', them: '0' };
        const first = page.rows[0];
        if (first && filters.page > 1) {
          // القيود الأحدث من الصفحة الحالية (تسبقها في الترتيب التنازلي).
          const preceding = await JournalEntryModel.findAll({
            where: periodWhere,
            include: journalInclude(statementMovementWhere),
            order: [
              [{ model: MovementModel, as: 'movement' }, 'created_at', 'DESC'],
              ['id_day', 'DESC'],
            ],
            limit: (filters.page - 1) * filters.limit,
            ...options,
          });
          beforePage = preceding.reduce(
            (sum, entry) => ({
              us: new Decimal(sum.us).plus(entry.amount_us).toFixed(AMOUNT_SCALE),
              them: new Decimal(sum.them).plus(entry.amount_them).toFixed(AMOUNT_SCALE),
            }),
            { us: '0', them: '0' },
          );
        }
        return {
          rows: page.rows.map(toJournalItem),
          count: page.count,
          opening,
          beforePage,
          period: await sideTotals(periodWhere, statementMovementWhere),
        };
      },
    },
    transferRepository: {
      async create(i) {
        const m = await TransferMovementModel.create(
          {
            movement_id: i.movementId,
            statement: i.statement,
            transfer_amount: i.transferAmount,
            transfer_currency_id: i.transferCurrencyId,
            first_client_id: i.fromClientId,
            first_currency_id: i.fromCurrencyId,
            first_exchange_rate: i.fromExchangeRate,
            fee_us: i.feeUs,
            fee_us_percentage: i.feeUsPercentage,
            total_us: i.totalUs,
            description_us: i.descriptionUs,
            second_client_id: i.toClientId,
            second_currency_id: i.toCurrencyId,
            second_exchange_rate: i.toExchangeRate,
            fee_them: i.feeThem,
            fee_them_percentage: i.feeThemPercentage,
            total_them: i.totalThem,
            description_them: i.descriptionThem,
          },
          options,
        );
        return { ...i, id: m.id_transfer };
      },
    },
    exchangeRepository: {
      async create(i) {
        const m = await ExchangeMovementModel.create(
          {
            movement_id: i.movementId,
            statement: null,
            first_client_id: i.clientId,
            second_client_id: i.profitLossClientId ?? null,
            first_currency_id: i.fromCurrencyId,
            second_currency_id: i.toCurrencyId,
            exchange_rate: i.exchangeRate,
            total_us: i.totalUs,
            total_them: i.totalThem,
            result: i.profitLoss,
          },
          options,
        );
        return { ...i, id: m.id_exchange };
      },
    },
    receiptPaymentRepository: {
      async create(i) {
        const m = await SettlementMovementModel.create(
          {
            movement_id: i.movementId,
            statement: i.statement,
            first_client_id: i.clientId,
            second_client_id: null,
            first_currency_id: i.currencyId,
            second_currency_id: null,
            first_amount: i.amount,
            second_amount: null,
            movement_kind: i.type,
            movement_system: 'SETTLEMENT',
          },
          options,
        );
        return { ...i, id: m.id_settlement };
      },
    },
    systemRepository: {
      async resetBusinessData() {
        // الترتيب يحترم قيود RESTRICT: القيود ← تفاصيل الحركات ← الحركات ← الإشعارات ← العملاء غير النظاميين ← المجموعات.
        const del = async (sql: string): Promise<number> => {
          const [, meta] = await sequelize.query(sql, options);
          const affected = (meta as { affectedRows?: number } | number | undefined) ?? 0;
          return typeof affected === 'number' ? affected : (affected.affectedRows ?? 0);
        };
        const journalEntries = await del('DELETE FROM journal_entries');
        await del('DELETE FROM transfer_movements');
        await del('DELETE FROM settlement_movements');
        await del('DELETE FROM multi_movements');
        await del('DELETE FROM exchange_movements');
        const movements = await del('DELETE FROM movements');
        const notifications = await del('DELETE FROM notifications');
        const clients = await del('DELETE FROM clients WHERE is_system = 0');
        const clientGroups = await del('DELETE FROM client_groups');
        await del('UPDATE clients SET archived_at = NULL, last_rollover_at = NULL WHERE is_system = 1');
        return { journalEntries, movements, notifications, clients, clientGroups };
      },
    },
    notificationRepository: {
      async create(i) {
        const m = await NotificationModel.create(
          {
            admin_id: i.adminId,
            title: i.title,
            message: i.message,
            notification_type: i.type,
            movement_id: i.movementId,
            is_read: i.isRead,
            actor_id: i.actorId ?? null,
            actor_name: i.actorName ?? null,
          },
          options,
        );
        return { ...i, id: m.id_notification };
      },
      async findPage(adminId, page, limit) {
        const result = await NotificationModel.findAndCountAll({
          where: { admin_id: adminId },
          order: [
            ['created_at', 'DESC'],
            ['id_notification', 'DESC'],
          ],
          offset: (page - 1) * limit,
          limit,
          ...options,
        });
        return {
          count: result.count,
          rows: result.rows.map((m) => ({
            id: m.id_notification,
            adminId: m.admin_id,
            title: m.title,
            message: m.message,
            type: m.notification_type,
            movementId: m.movement_id,
            isRead: m.is_read,
            actorId: m.actor_id,
            actorName: m.actor_name,
            createdAt: m.created_at?.toISOString(),
          })),
        };
      },
      async markRead(id, adminId) {
        const [count] = await NotificationModel.update(
          { is_read: true },
          { where: { id_notification: id, admin_id: adminId }, ...options },
        );
        return count === 1;
      },
      async countUnread(adminId) {
        return NotificationModel.count({ where: { admin_id: adminId, is_read: false }, ...options });
      },
      async markAllRead(adminId) {
        const [count] = await NotificationModel.update(
          { is_read: true },
          { where: { admin_id: adminId, is_read: false }, ...options },
        );
        return count;
      },
    },
  };
  if (!logger) return repositories;
  return Object.fromEntries(
    Object.entries(repositories).map(([name, repository]) => [
      name,
      new Proxy(repository, {
        get(target, property, receiver) {
          const value = Reflect.get(target, property, receiver);
          if (typeof value !== 'function') return value;
          return async (...args: unknown[]) => {
            try {
              return await value.apply(target, args);
            } catch (error) {
              throw mapDatabaseError(error, logger);
            }
          };
        },
      }),
    ]),
  ) as unknown as Repositories;
}
