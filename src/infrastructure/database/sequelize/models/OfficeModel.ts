import { Column, DataType, Model, Table } from 'sequelize-typescript';

/** المكاتب (المستأجرون) — غير مقيّد بسياق مكتب. */
@Table({ tableName: 'offices', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class OfficeModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_office: string;
  @Column({ type: DataType.STRING(16), allowNull: false, unique: true }) declare code: string;
  @Column({ type: DataType.STRING(150), allowNull: false }) declare name: string;
  @Column({ type: DataType.ENUM('ACTIVE', 'SUSPENDED', 'EXPIRED'), allowNull: false, defaultValue: 'ACTIVE' })
  declare status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  @Column(DataType.DATE) declare expires_at: Date | null;
  @Column(DataType.STRING(500)) declare message: string | null;
  @Column(DataType.STRING(30)) declare phone: string | null;
  @Column(DataType.STRING(255)) declare address: string | null;
  @Column(DataType.TEXT) declare notes: string | null;
  @Column(DataType.INTEGER.UNSIGNED) declare movement_limit: number | null;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }) declare movements_used: number;
  @Column(DataType.STRING(255)) declare logo_path: string | null;
  @Column(DataType.DATE) declare logo_updated_at: Date | null;
  @Column(DataType.DATE) declare created_at: Date;
  @Column(DataType.DATE) declare updated_at: Date;
}
