import { Column, DataType, Model, Table } from 'sequelize-typescript';
@Table({ tableName: 'movements', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class MovementModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_movement: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, unique: true }) declare movement_no: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare movement_type_id: string;
  @Column(DataType.BIGINT.UNSIGNED) declare client_id: string | null;
  @Column({ type: DataType.TIME, allowNull: false }) declare movement_time: string;
  @Column({ type: DataType.DECIMAL(30, 10), allowNull: false, defaultValue: '0.0000000000' }) declare total_result: string;
  @Column({ type: DataType.ENUM('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED'), allowNull: false, defaultValue: 'POSTED' })
  declare status: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare created_by: string;
  @Column(DataType.BIGINT.UNSIGNED) declare updated_by: string | null;
  @Column(DataType.DATE) declare reversed_at: Date | null;
  @Column(DataType.BIGINT.UNSIGNED) declare reversed_by: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}
