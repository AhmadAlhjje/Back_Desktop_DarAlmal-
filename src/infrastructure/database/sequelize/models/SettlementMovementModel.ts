import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'settlement_movements', timestamps: false })
export class SettlementMovementModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_settlement: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, unique: true }) declare movement_id: string;
  @Column(DataType.TEXT) declare statement: string | null;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare first_client_id: string;
  @Column(DataType.BIGINT.UNSIGNED) declare second_client_id: string | null;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare first_currency_id: string;
  @Column(DataType.BIGINT.UNSIGNED) declare second_currency_id: string | null;
  @Column({ type: DataType.DECIMAL(20, 4), allowNull: false }) declare first_amount: string;
  @Column(DataType.DECIMAL(20, 4)) declare second_amount: string | null;
  @Column({ type: DataType.ENUM('SETTLEMENT', 'ACCREDITATION', 'RECEIPT', 'PAYMENT'), allowNull: false })
  declare movement_kind: 'SETTLEMENT' | 'ACCREDITATION' | 'RECEIPT' | 'PAYMENT';
  @Column(DataType.ENUM('SETTLEMENT', 'ACCREDITATION'))
  declare movement_system: 'SETTLEMENT' | 'ACCREDITATION' | null;
}
