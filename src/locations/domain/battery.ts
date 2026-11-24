export const LOW_BATTERY_THRESHOLD = 30;
/** A new low-battery alert needs the level to have moved at least this much since the last one. */
export const MIN_LEVEL_CHANGE = 10;

export interface LowBatteryInput {
  level: number;
  lastAlertLevel: number | null | undefined;
  notificationsEnabled: boolean;
  notifyLowBattery: boolean;
}

export function shouldRaiseLowBattery(input: LowBatteryInput): boolean {
  if (!input.notificationsEnabled || !input.notifyLowBattery) return false;
  if (input.level >= LOW_BATTERY_THRESHOLD) return false;
  if (input.lastAlertLevel == null) return true;
  return Math.abs(input.lastAlertLevel - input.level) >= MIN_LEVEL_CHANGE;
}
