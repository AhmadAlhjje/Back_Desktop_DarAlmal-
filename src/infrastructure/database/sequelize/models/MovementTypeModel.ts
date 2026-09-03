import { Column, DataType, Model, Table } from 'sequelize-typescript';
@Table({ tableName: 'movement_types', timestamps: false })
export class MovementTypeModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_movement_type: string;
  @Column({ type: DataType.STRING(50), allowNull: false, unique: true }) declare movement_code: string;
  @Column({ type: DataType.STRING(100), allowNull: false }) declare movement_name: string;
  @Column(DataType.TEXT) declare description: string | null;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true }) declare is_active: boolean;
}
