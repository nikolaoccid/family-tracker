import { splitDurationByDay } from './split-duration';

const at = (iso: string) => new Date(iso);

describe('splitDurationByDay', () => {
  it('keeps a same-day stay in one bucket', () => {
    expect(splitDurationByDay(at('2026-03-02T10:00:00'), at('2026-03-02T11:30:00'))).toEqual([
      { date: '2026-03-02', minutes: 90 },
    ]);
  });

  it('splits a stay that crosses midnight', () => {
    const result = splitDurationByDay(at('2026-03-02T23:00:00'), at('2026-03-03T01:00:00'));
    expect(result.map((r) => r.date)).toEqual(['2026-03-02', '2026-03-03']);
    expect(result[0].minutes).toBeGreaterThanOrEqual(59);
    expect(result[0].minutes + result[1].minutes).toBeGreaterThanOrEqual(119);
    expect(result[0].minutes + result[1].minutes).toBeLessThanOrEqual(120);
  });

  it('includes whole days in the middle of a long stay', () => {
    const result = splitDurationByDay(at('2026-03-02T12:00:00'), at('2026-03-05T12:00:00'));
    expect(result.map((r) => r.date)).toEqual(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']);
    expect(result[1].minutes).toBeGreaterThanOrEqual(1439);
  });

  it('returns nothing for an empty stay', () => {
    expect(splitDurationByDay(at('2026-03-02T10:00:00'), at('2026-03-02T10:00:00'))).toEqual([]);
  });
});
