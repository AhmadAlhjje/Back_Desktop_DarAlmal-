import { fn, col, Op, type Transaction, type WhereOptions } from 'sequelize';
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

export function createRepositories(transaction?: Transaction, logger?: Logger): Repositories {
  const options = transaction ? { transaction } : {};
  const journalInclude = (movementWhere: Record<string, unknown> = {}) => [
    {
      model: MovementModel,
      as: 'movement',
      required: true,
      attributes: ['movement_no', 'movement_type_id', 'status', 'created_at'],
      where: movementWhere,
      include: [{ model: MovementTypeModel, as: 'movementType', attributes: ['movement_code'] }],
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
  const toJournalItem = (
    row: JournalEntryModel,
  ): import('../../../../application/ports/repositories/types.js').JournalItem => {
    const movement = row.get('movement') as MovementModel;
    const type = movement.get('movementType') as MovementTypeModel;
    return {
      id: row.id_day,
      movementId: row.movement_id,
      movementNo: movement.movement_no,
      movementTypeId: movement.movement_type_id,
      movementTypeCode: type.movement_code,
      movementStatus: movement.status,
      lineNo: Number(row.id_day),
      clientId: row.client_id,
      currencyId: row.currency_id,
      amount: row.amount_us !== '0.0000' ? row.amount_us : row.amount_them,
      side: row.amount_us !== '0.0000' ? EntrySide.US : EntrySide.THEM,
      exchangeRate: null,
      fees: '0.0000',
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
      async findByFullName(fullName) {
        const row = await AdminModel.findOne({ where: { full_name: fullName }, ...options });
        return row ? AdminMapper.toDomain(row) : null;
      },
      async findPage(page, limit) {
        const r = await AdminModel.findAndCountAll({
          order: [
            ['full_name', 'ASC'],
            ['id_admin', 'ASC'],
          ],
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
          order: [['group_name', 'ASC']],
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
          })),
        };
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
      async findPage(page, limit) {
        const r = await ClientModel.findAndCountAll({
          order: [
            ['full_name', 'ASC'],
            ['id_client', 'ASC'],
          ],
          offset: (page - 1) * limit,
          limit,
          ...options,
        });
        return { count: r.count, rows: r.rows.map(ClientMapper.toDomain) };
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
          },
          options,
        );
        return ClientMapper.toDomain(row);
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
        };
        const [count] = await ClientModel.update(data, { where: { id_client: id }, ...options });
        if (!count) return null;
        const m = await ClientModel.findByPk(id, options);
        return m ? ClientMapper.toDomain(m) : null;
      },
    },
    currencyRepository: {
      async findById(id) {
        const row = await CurrencyModel.findByPk(id, options);
        return row ? CurrencyMapper.toDomain(row) : null;
      },
      async findPage(page, limit) {
        const r = await CurrencyModel.findAndCountAll({
          order: [['currency_code', 'ASC']],
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
              amount: e.amount_us !== '0.0000' ? e.amount_us : e.amount_them,
              side: e.amount_us !== '0.0000' ? EntrySide.US : EntrySide.THEM,
              exchangeRate: null,
              fees: '0.0000',
              feePercentage: null,
              description: e.description,
              movementDate: row.created_at.toISOString().slice(0, 10),
              movementTime: e.movement_time,
            })),
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
            amount_us: e.side === EntrySide.US ? e.amount : '0.0000',
            amount_them: e.side === EntrySide.THEM ? e.amount : '0.0000',
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
          amount: e.amount_us !== '0.0000' ? e.amount_us : e.amount_them,
          side: e.amount_us !== '0.0000' ? EntrySide.US : EntrySide.THEM,
          exchangeRate: null,
          fees: '0.0000',
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
            [{ model: MovementModel, as: 'movement' }, 'created_at', 'ASC'],
            ['id_day', 'ASC'],
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
        const page = await JournalEntryModel.findAndCountAll({
          where: periodWhere,
          include: journalInclude(statementMovementWhere),
          order: [
            [{ model: MovementModel, as: 'movement' }, 'created_at', 'ASC'],
            ['id_day', 'ASC'],
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
          const preceding = await JournalEntryModel.findAll({
            where: periodWhere,
            include: journalInclude(statementMovementWhere),
            order: [
              [{ model: MovementModel, as: 'movement' }, 'created_at', 'ASC'],
              ['id_day', 'ASC'],
            ],
            limit: (filters.page - 1) * filters.limit,
            ...options,
          });
          beforePage = preceding.reduce(
            (sum, entry) => ({
              us: new Decimal(sum.us).plus(entry.amount_us).toFixed(4),
              them: new Decimal(sum.them).plus(entry.amount_them).toFixed(4),
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
            second_client_id: null,
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
