import { Column, DataType, Model, Table } from 'sequelize-typescript';
@Table({ tableName: 'clients', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class ClientModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_client: string;
  @Column({ type: DataType.STRING(50), allowNull: false, unique: true }) declare client_code: string;
  @Column(DataType.BIGINT.UNSIGNED) declare group_id: string | null;
  @Column({ type: DataType.STRING(200), allowNull: false }) declare full_name: string;
  @Column(DataType.STRING(30)) declare phone: string | null;
  @Column(DataType.STRING(150)) declare email: string | null;
  @Column(DataType.TEXT) declare address: string | null;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }) declare importance: number;
  @Column({ type: DataType.ENUM('CLIENT', 'BOX'), allowNull: false, defaultValue: 'CLIENT' })
  declare account_type: 'CLIENT' | 'BOX';
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false }) declare is_system: boolean;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false }) declare is_cash_box: boolean;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false }) declare is_secret: boolean;
  @Column(DataType.DATE) declare archived_at: Date | null;
  @Column(DataType.DATE) declare last_rollover_at: Date | null;
}
