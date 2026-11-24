import { shouldRaiseLowBattery } from './battery';

const input = { level: 20, lastAlertLevel: null, notificationsEnabled: true, notifyLowBattery: true };

describe('shouldRaiseLowBattery', () => {
  it('raises below the threshold when there was no earlier alert', () => {
    expect(shouldRaiseLowBattery(input)).toBe(true);
  });

  it('stays quiet at or above 30 percent', () => {
    expect(shouldRaiseLowBattery({ ...input, level: 30 })).toBe(false);
    expect(shouldRaiseLowBattery({ ...input, level: 80 })).toBe(false);
  });

  it('respects the user notification settings', () => {
    expect(shouldRaiseLowBattery({ ...input, notificationsEnabled: false })).toBe(false);
    expect(shouldRaiseLowBattery({ ...input, notifyLowBattery: false })).toBe(false);
  });

  it('does not repeat until the level moved by 10 points', () => {
    expect(shouldRaiseLowBattery({ ...input, level: 25, lastAlertLevel: 29 })).toBe(false);
    expect(shouldRaiseLowBattery({ ...input, level: 19, lastAlertLevel: 29 })).toBe(true);
  });
});
