import { Column, DataType, Model, Table } from 'sequelize-typescript';
@Table({ tableName: 'client_groups', timestamps: true, createdAt: 'created_at', updatedAt: false })
export class ClientGroupModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_group: string;
  /** المكتب المالك (عزل المستأجرين) — يُختم ويُقيَّد تلقائياً عبر tenancy-hooks. */
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare office_id: string;
  @Column({ type: DataType.STRING(150), allowNull: false }) declare group_name: string;
  @Column(DataType.TEXT) declare description: string | null;
}
