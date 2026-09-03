import { describe, expect, it, vi } from 'vitest';
import { UniqueConstraintError, ForeignKeyConstraintError, ConnectionError } from 'sequelize';
import { mapDatabaseError } from '../../src/infrastructure/database/sequelize/DatabaseErrorMapper.js';
const logger: any = { info: vi.fn(), error: vi.fn() };
describe('DatabaseErrorMapper', () => {
  it('maps unique errors to a safe conflict', () =>
    expect(mapDatabaseError(new UniqueConstraintError({ errors: [] }), logger)).toMatchObject({
      code: 'CONFLICT',
      status: 409,
    }));
  it('maps foreign keys without exposing SQL', () =>
    expect(
      mapDatabaseError(
        new ForeignKeyConstraintError({ table: 'x', fields: { id: '1' }, value: '1', index: 'fk' } as any),
        logger,
      ),
    ).toMatchObject({ code: 'INVALID_REFERENCE', status: 422 }));
  it('maps connection failure to service unavailable', () =>
    expect(mapDatabaseError(new ConnectionError(new Error('offline')), logger)).toMatchObject({
      code: 'DATABASE_UNAVAILABLE',
      status: 503,
    }));
});
