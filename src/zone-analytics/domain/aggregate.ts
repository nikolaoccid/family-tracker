import { DayMinutes, splitDurationByDay } from './split-duration';

export interface VisitLike {
  entryTime: Date | string;
  exitTime?: Date | string | null;
  duration?: number | null;
}

/** Inclusive day range; both bounds are "YYYY-MM-DD" in UTC and optional. */
export function filterVisitsByRange<V extends VisitLike>(
  visits: readonly V[],
  startDate?: string,
  endDate?: string,
): V[] {
  const from = startDate ? new Date(`${startDate}T00:00:00.000Z`).getTime() : undefined;
  const to = endDate ? new Date(`${endDate}T23:59:59.999Z`).getTime() : undefined;
  return visits.filter((visit) => {
    const at = new Date(visit.entryTime).getTime();
    return (from === undefined || at >= from) && (to === undefined || at <= to);
  });
}

export interface VisitTotals {
  totalTimeSpent: number;
  timeByDay: DayMinutes[];
}

/** Total completed minutes plus minutes per day; a visit still open counts until `now`. */
export function summarizeVisits(visits: readonly VisitLike[], now: Date): VisitTotals {
  const byDay = new Map<string, number>();
  for (const visit of visits) {
    const exit = visit.exitTime ? new Date(visit.exitTime) : now;
    for (const { date, minutes } of splitDurationByDay(new Date(visit.entryTime), exit)) {
      byDay.set(date, (byDay.get(date) ?? 0) + minutes);
    }
  }
  return {
    totalTimeSpent: visits.reduce((sum, v) => sum + (v.duration ?? 0), 0),
    timeByDay: [...byDay].map(([date, minutes]) => ({ date, minutes })),
  };
}
