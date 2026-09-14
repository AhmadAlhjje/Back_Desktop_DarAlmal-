import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'transfer_movements', timestamps: false })
export class TransferMovementModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_transfer: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, unique: true }) declare movement_id: string;
  @Column(DataType.TEXT) declare statement: string | null;
  @Column({ type: DataType.DECIMAL(30, 10), allowNull: false }) declare transfer_amount: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare transfer_currency_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare first_client_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare second_client_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare first_currency_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare second_currency_id: string;
  @Column({ type: DataType.DECIMAL(30, 10), allowNull: false }) declare first_exchange_rate: string;
  @Column({ type: DataType.DECIMAL(30, 10), allowNull: false }) declare second_exchange_rate: string;
  @Column({ type: DataType.DECIMAL(30, 10), allowNull: false }) declare fee_us: string;
  @Column({ type: DataType.DECIMAL(30, 10), allowNull: false }) declare fee_them: string;
  @Column(DataType.DECIMAL(20, 10)) declare fee_us_percentage: string | null;
  @Column(DataType.DECIMAL(20, 10)) declare fee_them_percentage: string | null;
  @Column({ type: DataType.DECIMAL(30, 10), allowNull: false }) declare total_us: string;
  @Column({ type: DataType.DECIMAL(30, 10), allowNull: false }) declare total_them: string;
  @Column(DataType.TEXT) declare description_us: string | null;
  @Column(DataType.TEXT) declare description_them: string | null;
}
