import type { JournalFilters, JournalRepository } from '../../ports/repositories/types.js';
export class GetJournal {
  constructor(private journal: JournalRepository) {}
  async execute(filters: JournalFilters) {
    const result = await this.journal.findPage(filters);
    return {
      entries: result.rows,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.count,
        pages: Math.ceil(result.count / filters.limit),
      },
    };
  }
}
