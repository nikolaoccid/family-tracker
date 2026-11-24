import { Injectable } from '@nestjs/common';
import { AlertDraft, AlertsService } from '../alerts';
import { FamiliesService } from '../families';
import { SafeZone, SafeZonesService, diffZones, zonesContaining } from '../safe-zones';
import type { User } from '../users';
import { ZoneAnalyticsService } from '../zone-analytics';
import { LocationDto } from './dto/location.dto';
import { parseDeviceTimestamp } from './domain/timestamps';

/** Turns a reported position into zone entry/exit records and alerts. */
@Injectable()
export class ZoneEventsService {
  constructor(
    private readonly families: FamiliesService,
    private readonly zones: SafeZonesService,
    private readonly analytics: ZoneAnalyticsService,
    private readonly alerts: AlertsService,
  ) {}

  async process(user: User, location: LocationDto): Promise<void> {
    const membership = await this.families.findMembership(user.id);
    if (!membership) return;

    const tracked = await this.zones.trackedZones(membership.familyId, user.id);
    const current = zonesContaining(location, tracked);
    const previous = await this.zones.findByIds(membership.activeZones ?? []);
    const { entered, left } = diffZones(current, previous);
    await this.families.setActiveZones(
      membership.id,
      current.map((z) => z.id),
    );

    const at = parseDeviceTimestamp(location.timestamp);
    const member = { id: user.id, name: user.name };
    const prefs = user.privacySettings;
    const draft = (type: 'zone_entry' | 'zone_exit', zone: SafeZone, verb: string): AlertDraft => ({
      type,
      userId: user.id,
      familyId: membership.familyId,
      message: `User ${user.name} ${verb} zone: ${zone.name}`,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.heading,
      locationTimestamp: new Date(location.timestamp),
    });

    for (const zone of entered) {
      await this.analytics.recordEntry(member, zone, at);
      if (prefs?.notificationsEnabled && prefs.notifyZoneEntry)
        await this.alerts.raise(draft('zone_entry', zone, 'entered'));
    }
    for (const zone of left) {
      await this.analytics.recordExit(member, zone, at);
      if (prefs?.notificationsEnabled && prefs.notifyZoneExit)
        await this.alerts.raise(draft('zone_exit', zone, 'left'));
    }
  }
}
