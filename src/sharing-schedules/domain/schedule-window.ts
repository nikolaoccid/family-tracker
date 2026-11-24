export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface ScheduleWindow {
  enabled: boolean;
  days: readonly DayOfWeek[];
  /** "H:MM" or "HH:MM" */
  startTime: string;
  endTime: string;
}

export const TIME_PATTERN = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Monday-first name for a JS Date (local time, like the schedules the user typed). */
export function dayOfWeek(at: Date): DayOfWeek {
  return DAYS_OF_WEEK[(at.getDay() + 6) % 7];
}

function previousDay(day: DayOfWeek): DayOfWeek {
  return DAYS_OF_WEEK[(DAYS_OF_WEEK.indexOf(day) + 6) % 7];
}

/**
 * True when `at` falls inside the window. Bounds are inclusive. A window whose end is
 * earlier than its start runs overnight: it belongs to the day it starts on and
 * covers the early hours of the next day.
 */
export function isWithinWindow(window: ScheduleWindow, at: Date): boolean {
  if (!window.enabled) return false;
  const now = at.getHours() * 60 + at.getMinutes();
  const start = toMinutes(window.startTime);
  const end = toMinutes(window.endTime);
  const today = dayOfWeek(at);

  if (start <= end) return window.days.includes(today) && now >= start && now <= end;
  if (window.days.includes(today) && now >= start) return true;
  return window.days.includes(previousDay(today)) && now <= end;
}

export function isAnyWindowActive(windows: readonly ScheduleWindow[], at: Date): boolean {
  return windows.some((w) => isWithinWindow(w, at));
}
