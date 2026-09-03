import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'exchange_movements', timestamps: false })
export class ExchangeMovementModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_exchange: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, unique: true }) declare movement_id: string;
  @Column(DataType.TEXT) declare statement: string | null;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare first_client_id: string;
  @Column(DataType.BIGINT.UNSIGNED) declare second_client_id: string | null;
  @Column({ type: DataType.DECIMAL(20, 8), allowNull: false }) declare exchange_rate: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare first_currency_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare second_currency_id: string;
  @Column({ type: DataType.DECIMAL(20, 4), allowNull: false }) declare total_us: string;
  @Column({ type: DataType.DECIMAL(20, 4), allowNull: false }) declare total_them: string;
  @Column({ type: DataType.DECIMAL(20, 4), allowNull: false }) declare result: string;
}
