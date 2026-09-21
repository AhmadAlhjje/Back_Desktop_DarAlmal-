import { Column, DataType, Model, Table } from 'sequelize-typescript';

/** أجهزة المكاتب (مفتاح الجهاز الدائم مجزَّأً) — غير مقيّد بسياق مكتب. */
@Table({ tableName: 'office_devices', timestamps: true, createdAt: 'created_at', updatedAt: false })
export class OfficeDeviceModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_device: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare office_id: string;
  @Column({ type: DataType.CHAR(64), allowNull: false, unique: true }) declare key_hash: string;
  @Column(DataType.STRING(150)) declare label: string | null;
  @Column(DataType.BIGINT.UNSIGNED) declare enrolled_by: string | null;
  @Column(DataType.DATE) declare last_seen_at: Date | null;
  @Column(DataType.DATE) declare revoked_at: Date | null;
  @Column(DataType.DATE) declare created_at: Date;
}
