import { DayOfWeek, ScheduleWindow, dayOfWeek, isAnyWindowActive, isWithinWindow } from './schedule-window';

// 2026-03-02 is a Monday. Local-time constructors keep the tests independent of the machine zone.
const monday = (h: number, m = 0) => new Date(2026, 2, 2, h, m);
const tuesday = (h: number, m = 0) => new Date(2026, 2, 3, h, m);

const window = (overrides: Partial<ScheduleWindow> = {}): ScheduleWindow => ({
  enabled: true,
  days: ['monday'] as DayOfWeek[],
  startTime: '08:00',
  endTime: '16:00',
  ...overrides,
});

describe('dayOfWeek', () => {
  it('is Monday-first and spells the name out', () => {
    expect(dayOfWeek(monday(9))).toBe('monday');
    expect(dayOfWeek(new Date(2026, 2, 8, 9))).toBe('sunday');
  });
});

describe('isWithinWindow', () => {
  it('is true inside the window on a listed day, bounds included', () => {
    expect(isWithinWindow(window(), monday(8, 0))).toBe(true);
    expect(isWithinWindow(window(), monday(12))).toBe(true);
    expect(isWithinWindow(window(), monday(16, 0))).toBe(true);
  });

  it('is false just outside the window', () => {
    expect(isWithinWindow(window(), monday(7, 59))).toBe(false);
    expect(isWithinWindow(window(), monday(16, 1))).toBe(false);
  });

  it('is false on days that are not listed', () => {
    expect(isWithinWindow(window(), tuesday(12))).toBe(false);
  });

  it('is false when disabled', () => {
    expect(isWithinWindow(window({ enabled: false }), monday(12))).toBe(false);
  });

  it('accepts unpadded hours', () => {
    expect(isWithinWindow(window({ startTime: '8:00', endTime: '9:30' }), monday(9, 0))).toBe(true);
  });

  describe('overnight windows', () => {
    const night = window({ startTime: '22:00', endTime: '06:00' });

    it('covers the evening of the listed day', () => {
      expect(isWithinWindow(night, monday(23))).toBe(true);
    });

    it('continues into the early hours of the next day', () => {
      expect(isWithinWindow(night, tuesday(5, 30))).toBe(true);
    });

    it('does not cover the early hours of the listed day itself', () => {
      expect(isWithinWindow(night, monday(5, 30))).toBe(false);
    });

    it('is closed during the day', () => {
      expect(isWithinWindow(night, monday(12))).toBe(false);
    });
  });
});

describe('isAnyWindowActive', () => {
  it('is true when one of several windows matches', () => {
    expect(isAnyWindowActive([window({ enabled: false }), window()], monday(10))).toBe(true);
  });

  it('is false with no windows', () => {
    expect(isAnyWindowActive([], monday(10))).toBe(false);
  });
});
