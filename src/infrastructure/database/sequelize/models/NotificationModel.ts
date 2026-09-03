import { Column, DataType, Model, Table } from 'sequelize-typescript';
@Table({ tableName: 'notifications', timestamps: true, createdAt: 'created_at', updatedAt: false })
export class NotificationModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_notification: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare admin_id: string;
  @Column({ type: DataType.STRING(200), allowNull: false }) declare title: string;
  @Column({ type: DataType.TEXT, allowNull: false }) declare message: string;
  @Column(DataType.STRING(50)) declare notification_type: string | null;
  @Column(DataType.BIGINT.UNSIGNED) declare movement_id: string | null;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false }) declare is_read: boolean;
}
