export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface CircularZone {
  id: string;
  centerLatitude: number;
  centerLongitude: number;
  /** Metres */
  radius: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** The zone boundary counts as inside. */
export function isInsideZone(point: GeoPoint, zone: CircularZone): boolean {
  const center = { latitude: zone.centerLatitude, longitude: zone.centerLongitude };
  return haversineMeters(point, center) <= zone.radius;
}

export function zonesContaining<Z extends CircularZone>(point: GeoPoint, zones: readonly Z[]): Z[] {
  return zones.filter((zone) => isInsideZone(point, zone));
}

export interface ZoneTransitions<Z> {
  entered: Z[];
  left: Z[];
}

/** Which zones a member just entered or left, given where they are now and where they were. */
export function diffZones<Z extends { id: string }>(current: readonly Z[], previous: readonly Z[]): ZoneTransitions<Z> {
  const currentIds = new Set(current.map((z) => z.id));
  const previousIds = new Set(previous.map((z) => z.id));
  return {
    entered: current.filter((z) => !previousIds.has(z.id)),
    left: previous.filter((z) => !currentIds.has(z.id)),
  };
}
