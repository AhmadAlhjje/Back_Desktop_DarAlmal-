import { Column, DataType, Model, Table } from 'sequelize-typescript';

/** إعلان المنصّة: صفّ واحد (id = 1) — عام لكل المكاتب فلا يخضع لتقييد المستأجر. */
@Table({ tableName: 'platform_notice', timestamps: true, createdAt: false, updatedAt: 'updated_at' })
export class PlatformNoticeModel extends Model {
  @Column({ type: DataType.TINYINT.UNSIGNED, primaryKey: true }) declare id_notice: number;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false }) declare is_active: boolean;
  @Column(DataType.STRING(150)) declare title: string | null;
  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '' }) declare message: string;
  @Column(DataType.DATE) declare updated_at: Date | null;
}
