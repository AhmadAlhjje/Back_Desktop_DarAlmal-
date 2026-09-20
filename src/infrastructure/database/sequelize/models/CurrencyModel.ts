import { Column, DataType, Model, Table } from 'sequelize-typescript';
@Table({ tableName: 'currencies', timestamps: true, createdAt: 'created_at', updatedAt: false })
export class CurrencyModel extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id_currency: string;
  /** المكتب المالك (عزل المستأجرين) — يُختم ويُقيَّد تلقائياً عبر tenancy-hooks. */
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare office_id: string;
  @Column({ type: DataType.STRING(100), allowNull: false }) declare currency_name: string;
  @Column({ type: DataType.STRING(10), allowNull: false }) declare currency_code: string;
  @Column(DataType.STRING(20)) declare currency_symbol: string | null;
  @Column({ type: DataType.TINYINT.UNSIGNED, allowNull: false, defaultValue: 2 }) declare decimal_places: number;
  @Column(DataType.STRING(500)) declare icon_path: string | null;
  @Column(DataType.STRING(20)) declare text_icon: string | null;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }) declare importance: number;
  @Column({ type: DataType.DECIMAL(30, 10), allowNull: false, defaultValue: '1.0000000000' })
  declare exchange_rate: string;
  @Column({ type: DataType.ENUM('FROM_USD_MULTIPLY', 'TO_USD_DIVIDE'), allowNull: false })
  declare exchange_type: 'FROM_USD_MULTIPLY' | 'TO_USD_DIVIDE';
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true }) declare is_active: boolean;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false }) declare is_system: boolean;
}
