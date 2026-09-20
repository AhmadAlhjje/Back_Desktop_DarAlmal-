import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'admins', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class AdminModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_admin: string;
  /** المكتب المالك (عزل المستأجرين) — يُختم ويُقيَّد تلقائياً عبر tenancy-hooks. */
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare office_id: string;
  @Column({ type: DataType.STRING(150), allowNull: false }) declare full_name: string;
  @Column(DataType.STRING(30)) declare phone: string | null;
  @Column(DataType.STRING(150)) declare email: string | null;
  @Column({ type: DataType.STRING(255), allowNull: false }) declare password_hash: string;
  @Column({ type: DataType.ENUM('ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE', 'VIEWER'), allowNull: false })
  declare role: string;
  @Column(DataType.JSON) declare permissions: string[] | null;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false }) declare is_developer: boolean;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true }) declare is_active: boolean;
}
