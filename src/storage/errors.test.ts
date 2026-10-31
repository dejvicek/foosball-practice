import { isPermanent, StorageError, fromPostgrest } from './errors';

describe('chyby úložiště', () => {
  it('omezení a oprávnění jsou trvalé, síť a 5xx dočasné', () => {
    expect(isPermanent(fromPostgrest({ message: 'dup', code: '23505' }, 409))).toBe(true);
    expect(isPermanent(fromPostgrest({ message: 'range', code: '22003' }, 400))).toBe(true);
    expect(isPermanent(fromPostgrest({ message: 'rls', code: '42501' }, 401))).toBe(true);
    expect(isPermanent(fromPostgrest({ message: 'fk', code: '23503' }, 409))).toBe(true);
    expect(isPermanent(fromPostgrest({ message: 'TypeError: Failed to fetch', code: '' }, 0))).toBe(false);
    expect(isPermanent(fromPostgrest({ message: 'bad gateway', code: '' }, 502))).toBe(false);
    expect(isPermanent(fromPostgrest({ message: 'slow down', code: '' }, 429))).toBe(false);
    expect(isPermanent(new Error('cokoli'))).toBe(false);
  });
  it('duplicitní jméno má srozumitelný popis', () => {
    expect((fromPostgrest({ message: 'dup', code: '23505' }, 409) as StorageError).userMessage).toMatch(/jméno/);
  });
});
