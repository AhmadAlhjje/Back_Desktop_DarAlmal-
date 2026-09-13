import type { MovementListFilters, MovementRepository } from '../../ports/repositories/types.js';
/** سجل الحركات: حركة لكل صف مع طرفيها وملخص المجاميع على كامل النتائج المفلترة. */
export class ListMovements {
  constructor(private movements: MovementRepository) {}
  async execute(filters: MovementListFilters) {
    const result = await this.movements.findListPage(filters);
    return {
      movements: result.rows,
      summary: result.summary,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.count,
        pages: Math.ceil(result.count / filters.limit),
      },
    };
  }
}
