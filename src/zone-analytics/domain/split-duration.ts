import { addDays, differenceInMinutes, endOfDay, format, max, min, startOfDay } from 'date-fns';

export interface DayMinutes {
  date: string;
  minutes: number;
}

/** Splits a stay into whole minutes per calendar day; days with no minutes are left out. */
export function splitDurationByDay(entry: Date, exit: Date): DayMinutes[] {
  const results: DayMinutes[] = [];
  const lastDay = startOfDay(exit);

  for (let day = startOfDay(entry); day <= lastDay; day = addDays(day, 1)) {
    const minutes = differenceInMinutes(min([exit, endOfDay(day)]), max([entry, day]));
    if (minutes > 0) results.push({ date: format(day, 'yyyy-MM-dd'), minutes });
  }
  return results;
}
