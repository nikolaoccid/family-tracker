const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

/** Parses a device timestamp; one without a zone designator is read as UTC. */
export function parseDeviceTimestamp(input: string): Date {
  const date = new Date(HAS_ZONE.test(input) ? input : `${input}Z`);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid timestamp: ${input}`);
  return date;
}
