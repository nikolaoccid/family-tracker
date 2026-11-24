import { decodeCursor, encodeCursor, resolveLimit, toPage } from './pagination';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from './page-query.dto';

describe('resolveLimit', () => {
  it('defaults and caps', () => {
    expect(resolveLimit()).toBe(DEFAULT_PAGE_LIMIT);
    expect(resolveLimit(5)).toBe(5);
    expect(resolveLimit(MAX_PAGE_LIMIT * 10)).toBe(MAX_PAGE_LIMIT);
    expect(resolveLimit(0)).toBe(1);
  });
});

describe('cursor', () => {
  it('round-trips strings and numbers', () => {
    expect(decodeCursor(encodeCursor(['2026-03-02T10:00:00.000Z', 'abc', 4.5]))).toEqual([
      '2026-03-02T10:00:00.000Z',
      'abc',
      4.5,
    ]);
  });

  it('is undefined when absent and rejects garbage', () => {
    expect(decodeCursor(undefined)).toBeUndefined();
    expect(() => decodeCursor('%%%')).toThrow(/Malformed cursor/);
    expect(() => decodeCursor(Buffer.from('{"a":1}').toString('base64url'))).toThrow(/Malformed cursor/);
  });
});

describe('toPage', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('returns everything and no cursor when the page is not full', () => {
    expect(toPage(rows, 3, (r) => [r.id])).toEqual({ items: rows });
  });

  it('drops the probe row and points the cursor at the last returned row', () => {
    const page = toPage(rows, 2, (r) => [r.id]);
    expect(page.items).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(decodeCursor(page.nextCursor)).toEqual(['b']);
  });
});
