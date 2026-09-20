/** إحصاءات المنصّة عبر المكاتب (لوحة التحكم) — تُقرأ من كل المكاتب عمداً. */
export interface OfficeStats {
  officeId: string;
  admins: number;
  activeAdmins: number;
  clients: number;
  movements: number;
  movementsToday: number;
  lastMovementAt: string | null;
}

export interface PlatformOverview {
  offices: { total: number; active: number; suspended: number; expired: number };
  movements: { total: number; today: number };
  clients: number;
  admins: number;
}

export interface PlatformStatsRepository {
  /** إحصاءات المكاتب المطلوبة (أو كلها إن لم تُحدَّد). */
  statsFor(officeIds?: string[]): Promise<OfficeStats[]>;
  overview(): Promise<PlatformOverview>;
}
