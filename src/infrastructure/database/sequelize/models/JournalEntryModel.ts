import { Column, DataType, Model, Table } from 'sequelize-typescript';
@Table({ tableName: 'journal_entries', timestamps: true, createdAt: 'created_at', updatedAt: false })
export class JournalEntryModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_day: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare movement_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare client_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare currency_id: string;
  @Column({ type: DataType.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' }) declare amount_us: string;
  @Column({ type: DataType.DECIMAL(20, 4), allowNull: false, defaultValue: '0.0000' }) declare amount_them: string;
  @Column(DataType.TEXT) declare description: string | null;
  @Column({ type: DataType.TIME, allowNull: false }) declare movement_time: string;
  declare created_at: Date;
}
