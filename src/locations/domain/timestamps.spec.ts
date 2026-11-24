import { parseDeviceTimestamp } from './timestamps';

describe('parseDeviceTimestamp', () => {
  it('keeps explicit offsets', () => {
    expect(parseDeviceTimestamp('2026-03-02T10:00:00+01:00').toISOString()).toBe('2026-03-02T09:00:00.000Z');
    expect(parseDeviceTimestamp('2026-03-02T10:00:00Z').toISOString()).toBe('2026-03-02T10:00:00.000Z');
  });

  it('reads a timestamp without a zone as UTC', () => {
    expect(parseDeviceTimestamp('2026-03-02T10:00:00').toISOString()).toBe('2026-03-02T10:00:00.000Z');
  });

  it('rejects garbage', () => {
    expect(() => parseDeviceTimestamp('not a date')).toThrow(RangeError);
  });
});
