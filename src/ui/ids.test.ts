import { newUuid } from './ids';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newUuid', () => {
  it('funguje i bez crypto.randomUUID (http mimo localhost)', () => {
    const orig = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const a = newUuid();
      expect(a).toMatch(UUID);
      expect(newUuid()).not.toBe(a);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: orig, configurable: true });
    }
  });
});
