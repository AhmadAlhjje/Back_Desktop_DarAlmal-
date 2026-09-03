import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'multi_movements', timestamps: false })
export class MultiMovementModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_multi: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare movement_id: string;
  @Column(DataType.TEXT) declare statement: string | null;
  @Column({ type: DataType.ENUM('DEBIT_US', 'CREDIT_US'), allowNull: false })
  declare party_side: 'DEBIT_US' | 'CREDIT_US';
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare client_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare currency_id: string;
  @Column({ type: DataType.DECIMAL(20, 4), allowNull: false }) declare amount: string;
}
