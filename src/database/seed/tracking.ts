import { EntityManager } from 'typeorm';
import { Alert, AlertType } from '../../alerts/entities/alert.entity';
import { FamilyMember } from '../../families/entities/family-member.entity';
import { LocationHistory } from '../../locations/entities/location-history.entity';
import { resolveVisibleTo } from '../../privacy-settings';
import { SafeZone, diffZones, zonesContaining } from '../../safe-zones';
import type { ScheduleWindow } from '../../sharing-schedules';
import { User } from '../../users/entities/user.entity';
import { ZoneAnalytics } from '../../zone-analytics/entities/zone-analytics.entity';
import { ZoneVisit } from '../../zone-analytics/entities/zone-visit.entity';
import { TrackPoint, generateDay } from './movement';
import { People, SeededFamily } from './people';
import { createRandom, seedFrom, stableUuid } from './prng';
import { planFor } from './routines';

const HISTORY_DAYS = 14;
const CHUNK = 500;

interface OpenVisit {
  zone: SafeZone;
  entry: Date;
}

async function insertChunked<T extends object>(em: EntityManager, target: new () => T, rows: T[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) await em.insert(target, rows.slice(i, i + CHUNK) as never);
}

function trackFor(spec: SeededFamily, person: string, routine: Parameters<typeof planFor>[0], now: Date): TrackPoint[] {
  const random = createRandom(seedFrom(`${spec.spec.name}:${person}`));
  const available = spec.spec.zones;
  const points: TrackPoint[] = [];
  for (let back = HISTORY_DAYS; back >= 0; back--) {
    const day = new Date(now.getTime() - back * 24 * 60 * 60 * 1000);
    const plan = planFor(routine, day.getUTCDay(), HISTORY_DAYS - back, available);
    points.push(...generateDay(day, plan, random).filter((p) => p.at <= now));
  }
  return points;
}

export async function createTracking(em: EntityManager, people: People, now: Date): Promise<void> {
  const history: LocationHistory[] = [];
  const analytics: ZoneAnalytics[] = [];
  const visits: ZoneVisit[] = [];
  const alerts: Alert[] = [];
  const updatedMembers: FamilyMember[] = [];

  for (const fam of people.families) {
    const memberKeys = [...fam.spec.admins, ...fam.spec.members];
    const ids = memberKeys.map((k) => (people.users.get(k) as User).id);

    for (const key of memberKeys) {
      const user = people.users.get(key) as User;
      const spec = people.specs.get(key)!;
      const prefs = people.settings.get(key)!;
      const windows: ScheduleWindow[] = (prefs.schedules ?? []) as ScheduleWindow[];
      const peerIds = ids.filter((id) => id !== user.id);
      const points = trackFor(fam, key, spec.routine, now);

      let current: SafeZone[] = [];
      const open = new Map<string, OpenVisit>();
      const perZone = new Map<string, ZoneAnalytics>();
      const zoneAnalytics = (zone: SafeZone): ZoneAnalytics => {
        let record = perZone.get(zone.id);
        if (!record) {
          record = Object.assign(new ZoneAnalytics(), {
            id: stableUuid(`analytics:${user.id}:${zone.id}`),
            userId: user.id,
            userName: user.name,
            zoneId: zone.id,
            zoneName: zone.name,
            totalTimeSpent: 0,
            timeByDay: [],
          });
          perZone.set(zone.id, record);
          analytics.push(record);
        }
        return record;
      };
      const raise = (type: AlertType, zone: SafeZone, at: Date, p: TrackPoint, verb: string) =>
        alerts.push(
          Object.assign(new Alert(), {
            type,
            userId: user.id,
            familyId: fam.family.id,
            message: `User ${user.name} ${verb} zone: ${zone.name}`,
            latitude: p.latitude,
            longitude: p.longitude,
            accuracy: p.accuracy,
            speed: p.speed,
            heading: p.heading,
            locationTimestamp: at,
            timestamp: at,
          }),
        );

      points.forEach((p, i) => {
        const whoCanSeeLocation = resolveVisibleTo({
          userId: user.id,
          peerIds,
          settings: {
            locationSharingEnabled: spec.visibleTo !== 'none',
            visibleTo: spec.visibleTo,
            selectedMembers: prefs.selectedMembers,
            schedules: windows,
          },
          now: p.at,
        });
        history.push(
          Object.assign(new LocationHistory(), {
            id: stableUuid(`point:${user.id}:${i}`),
            userId: user.id,
            latitude: p.latitude,
            longitude: p.longitude,
            accuracy: p.accuracy,
            speed: p.speed,
            heading: p.heading,
            timestamp: p.at,
            whoCanSeeLocation,
          }),
        );

        const next = zonesContaining(p, fam.zones);
        const { entered, left } = diffZones(next, current);
        for (const zone of left) {
          const visit = open.get(zone.id);
          open.delete(zone.id);
          if (visit) {
            visits.push(
              Object.assign(new ZoneVisit(), {
                id: stableUuid(`visit:${user.id}:${zone.id}:${visit.entry.toISOString()}`),
                entryTime: visit.entry,
                exitTime: p.at,
                duration: Math.floor((p.at.getTime() - visit.entry.getTime()) / 60_000),
                analytics: zoneAnalytics(zone),
              }),
            );
          }
          raise('zone_exit', zone, p.at, p, 'left');
        }
        for (const zone of entered) {
          open.set(zone.id, { zone, entry: p.at });
          raise('zone_entry', zone, p.at, p, 'entered');
        }
        current = next;
      });

      for (const { zone, entry } of open.values()) {
        visits.push(
          Object.assign(new ZoneVisit(), {
            id: stableUuid(`visit:${user.id}:${zone.id}:${entry.toISOString()}`),
            entryTime: entry,
            analytics: zoneAnalytics(zone),
          }),
        );
      }

      const last = points[points.length - 1];
      const member = fam.members.find((m) => m.userId === user.id);
      if (last && member) {
        const lastId = stableUuid(`point:${user.id}:${points.length - 1}`);
        member.latitude = last.latitude;
        member.longitude = last.longitude;
        member.lastSeen = last.at;
        member.batteryLevel = 25 + Math.floor(createRandom(seedFrom(user.id))() * 70);
        member.activeZones = current.map((z) => z.id);
        member.pushTokens = [`ExponentPushToken[demo-${key}]`];
        member.latestLocationId = lastId;
        updatedMembers.push(member);
      }
    }
  }

  await em.save(analytics);
  await insertChunked(em, LocationHistory, history);
  await insertChunked(em, ZoneVisit, visits);
  await insertChunked(em, Alert, alerts);
  await em.save(updatedMembers);
}
