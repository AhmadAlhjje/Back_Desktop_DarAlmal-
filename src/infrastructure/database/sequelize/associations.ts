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
  MultiMovementModel,
  TransferMovementModel,
} from './models/index.js';

export function configureAssociations(): void {
  ClientGroupModel.hasMany(ClientModel, { foreignKey: 'group_id', as: 'clients' });
  ClientModel.belongsTo(ClientGroupModel, { foreignKey: 'group_id', as: 'group' });
  MovementTypeModel.hasMany(MovementModel, { foreignKey: 'movement_type_id', as: 'movements' });
  MovementModel.belongsTo(MovementTypeModel, { foreignKey: 'movement_type_id', as: 'movementType' });
  MovementModel.belongsTo(ClientModel, { foreignKey: 'client_id', as: 'client' });
  MovementModel.belongsTo(AdminModel, { foreignKey: 'created_by', as: 'creator' });
  MovementModel.belongsTo(AdminModel, { foreignKey: 'updated_by', as: 'updater' });
  MovementModel.hasMany(JournalEntryModel, { foreignKey: 'movement_id', as: 'journalEntries' });
  JournalEntryModel.belongsTo(MovementModel, { foreignKey: 'movement_id', as: 'movement' });
  JournalEntryModel.belongsTo(ClientModel, { foreignKey: 'client_id', as: 'client' });
  JournalEntryModel.belongsTo(CurrencyModel, { foreignKey: 'currency_id', as: 'currency' });
  MovementModel.hasOne(TransferMovementModel, { foreignKey: 'movement_id', as: 'transferDetail' });
  TransferMovementModel.belongsTo(MovementModel, { foreignKey: 'movement_id', as: 'movement' });
  MovementModel.hasOne(ExchangeMovementModel, { foreignKey: 'movement_id', as: 'exchangeDetail' });
  ExchangeMovementModel.belongsTo(MovementModel, { foreignKey: 'movement_id', as: 'movement' });
  MovementModel.hasOne(SettlementMovementModel, { foreignKey: 'movement_id', as: 'receiptPaymentDetail' });
  SettlementMovementModel.belongsTo(MovementModel, { foreignKey: 'movement_id', as: 'movement' });
  MovementModel.hasMany(MultiMovementModel, { foreignKey: 'movement_id', as: 'multiDetails' });
  MultiMovementModel.belongsTo(MovementModel, { foreignKey: 'movement_id', as: 'movement' });
  AdminModel.hasMany(NotificationModel, { foreignKey: 'admin_id', as: 'notifications' });
  NotificationModel.belongsTo(AdminModel, { foreignKey: 'admin_id', as: 'admin' });
  NotificationModel.belongsTo(MovementModel, { foreignKey: 'movement_id', as: 'movement' });
}
