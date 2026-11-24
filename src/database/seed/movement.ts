import { haversineMeters } from '../../safe-zones';

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  /** Zone radius in metres. */
  radius: number;
}

export interface Stop {
  place: Place;
  /** Minutes after midnight (UTC) the person arrives and leaves. */
  arrive: number;
  leave: number;
}

export interface TrackPoint {
  at: Date;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
}

const DWELL_STEP_MIN = 15;
const TRAVEL_STEP_MIN = 3;
const TRAVEL_SPEED_MS = 9; // about 32 km/h
const METRES_PER_DEGREE = 111_320;

function jitter(random: () => number, metres: number): number {
  return ((random() - 0.5) * 2 * metres) / METRES_PER_DEGREE;
}

function bearing(from: Place, to: Place): number {
  const dy = to.latitude - from.latitude;
  const dx = (to.longitude - from.longitude) * Math.cos((from.latitude * Math.PI) / 180);
  return (Math.atan2(dx, dy) * 180) / Math.PI + (dx < 0 ? 360 : 0);
}

/** One day of movement: dwell inside each place, travel in a straight line between them. */
export function generateDay(day: Date, stops: readonly Stop[], random: () => number): TrackPoint[] {
  const midnight = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const at = (minutes: number) => new Date(midnight + minutes * 60_000);
  const points: TrackPoint[] = [];

  stops.forEach((stop, i) => {
    const { place } = stop;
    for (let m = stop.arrive; m <= stop.leave; m += DWELL_STEP_MIN) {
      points.push({
        at: at(m),
        latitude: place.latitude + jitter(random, place.radius * 0.4),
        longitude: place.longitude + jitter(random, place.radius * 0.4),
        accuracy: 5 + Math.round(random() * 15),
        speed: 0,
        heading: 0,
      });
    }
    const next = stops[i + 1];
    if (!next) return;

    const distance = haversineMeters(place, next.place);
    const travelMinutes = Math.max(TRAVEL_STEP_MIN * 2, Math.ceil(distance / TRAVEL_SPEED_MS / 60));
    const start = stop.leave;
    const steps = Math.floor(travelMinutes / TRAVEL_STEP_MIN);
    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1);
      points.push({
        at: at(start + s * TRAVEL_STEP_MIN),
        latitude: place.latitude + (next.place.latitude - place.latitude) * t + jitter(random, 15),
        longitude: place.longitude + (next.place.longitude - place.longitude) * t + jitter(random, 15),
        accuracy: 8 + Math.round(random() * 12),
        speed: Math.round(TRAVEL_SPEED_MS * (0.7 + random() * 0.6) * 10) / 10,
        heading: Math.round(bearing(place, next.place)),
      });
    }
  });
  return points;
}
