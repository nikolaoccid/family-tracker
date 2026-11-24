import { filterVisitsByRange, summarizeVisits } from './aggregate';

const visit = (entry: string, exit: string | null, duration: number | null) => ({
  entryTime: new Date(entry),
  exitTime: exit ? new Date(exit) : null,
  duration,
});

describe('filterVisitsByRange', () => {
  const visits = [
    visit('2026-03-01T10:00:00Z', '2026-03-01T11:00:00Z', 60),
    visit('2026-03-02T10:00:00Z', '2026-03-02T11:00:00Z', 60),
    visit('2026-03-03T23:59:00Z', '2026-03-04T00:30:00Z', 31),
  ];

  it('returns everything without bounds', () => {
    expect(filterVisitsByRange(visits)).toHaveLength(3);
  });

  it('includes both end days entirely', () => {
    expect(filterVisitsByRange(visits, '2026-03-02', '2026-03-03')).toHaveLength(2);
  });

  it('filters by entry time, not exit time', () => {
    expect(filterVisitsByRange(visits, '2026-03-04')).toHaveLength(0);
  });

  it('supports an open start or end', () => {
    expect(filterVisitsByRange(visits, undefined, '2026-03-01')).toHaveLength(1);
    expect(filterVisitsByRange(visits, '2026-03-03')).toHaveLength(1);
  });
});

describe('summarizeVisits', () => {
  it('sums recorded durations', () => {
    const { totalTimeSpent } = summarizeVisits(
      [
        visit('2026-03-01T10:00:00', '2026-03-01T11:00:00', 60),
        visit('2026-03-01T12:00:00', '2026-03-01T12:30:00', 30),
      ],
      new Date(),
    );
    expect(totalTimeSpent).toBe(90);
  });

  it('merges visits of the same day into one bucket', () => {
    const { timeByDay } = summarizeVisits(
      [
        visit('2026-03-01T10:00:00', '2026-03-01T11:00:00', 60),
        visit('2026-03-01T12:00:00', '2026-03-01T12:30:00', 30),
      ],
      new Date(),
    );
    expect(timeByDay).toEqual([{ date: '2026-03-01', minutes: 90 }]);
  });

  it('counts a visit that is still open until now, but not in the total', () => {
    const now = new Date('2026-03-01T10:45:00');
    const result = summarizeVisits([visit('2026-03-01T10:00:00', null, null)], now);
    expect(result.timeByDay).toEqual([{ date: '2026-03-01', minutes: 45 }]);
    expect(result.totalTimeSpent).toBe(0);
  });
});
