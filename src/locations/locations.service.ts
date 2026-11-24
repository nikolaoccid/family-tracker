import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenError } from '../common/errors/domain-error';
import { CursorPart, Page, PageRequest, toPage } from '../common/pagination/pagination';
import { AlertsService } from '../alerts';
import { FamiliesService } from '../families';
import { PrivacySettingsService, resolveVisibleTo } from '../privacy-settings';
import type { User } from '../users';
import { shouldRaiseLowBattery } from './domain/battery';
import { LocationDto } from './dto/location.dto';
import { LocationHistory } from './entities/location-history.entity';
import { ZoneEventsService } from './zone-events.service';

export interface HistoryFilter {
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(LocationHistory) private readonly history: Repository<LocationHistory>,
    private readonly families: FamiliesService,
    private readonly privacy: PrivacySettingsService,
    private readonly alerts: AlertsService,
    private readonly zoneEvents: ZoneEventsService,
  ) {}

  /** Stores a point, refreshes the member's last position and raises zone entry/exit alerts. */
  async report(user: User, dto: LocationDto) {
    const whoCanSeeLocation = await this.visibleTo(user.id);
    const timestamp = new Date(dto.timestamp);
    const saved = await this.history.save({
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      speed: dto.speed,
      heading: dto.heading,
      userId: user.id,
      timestamp,
      whoCanSeeLocation,
    });
    await this.families.recordLocation(user.id, { ...dto, timestamp }, saved.id);
    await this.zoneEvents.process(user, dto);
    return { message: 'Location reported successfully' };
  }

  familyLocations(familyId: string, viewer: User) {
    return this.families.visibleLocations(familyId, viewer.id);
  }

  /**
   * One point per distinct coordinate, newest timestamp wins. Other family members only
   * see points the owner allowed them to see when reporting.
   */
  async historyFor(viewerId: string, userId: string, filter: HistoryFilter, { limit, after }: PageRequest) {
    await this.assertMaySee(viewerId, userId);
    const params: unknown[] = [userId];
    const next = (value: unknown) => `$${params.push(value)}`;
    let where = `"user_id" = $1`;

    if (viewerId !== userId) where += ` AND ${next(viewerId)} = ANY(string_to_array(who_can_see_location, ','))`;
    if (filter.startDate) where += ` AND timestamp >= ${next(new Date(filter.startDate).toISOString())}`;
    if (filter.endDate) {
      const exclusiveEnd = new Date(filter.endDate);
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
      where += ` AND timestamp < ${next(exclusiveEnd.toISOString())}`;
    }
    if (after) where += ` AND (latitude, longitude) > (${next(after[0])}::float8, ${next(after[1])}::float8)`;

    const rows: Array<LocationHistory & { latitude: number; longitude: number }> = await this.history.query(
      `SELECT DISTINCT ON (latitude, longitude) * FROM location_history
       WHERE ${where}
       ORDER BY latitude, longitude, timestamp DESC
       LIMIT ${next(limit + 1)}`,
      params,
    );
    return toPage(rows, limit, (r): CursorPart[] => [r.latitude, r.longitude]);
  }

  async updateBattery(user: User, level: number) {
    const membership = await this.families.findMembership(user.id);
    if (!membership) return;

    const prefs = user.privacySettings;
    const wantsAlerts = !!prefs?.notificationsEnabled && !!prefs?.notifyLowBattery;
    await this.families.setBatteryLevel(user.id, wantsAlerts ? level : null);
    if (!wantsAlerts || !membership.latestLocation) return;

    const last = await this.alerts.lastOfType(user.id, 'low_battery');
    const raise = shouldRaiseLowBattery({
      level,
      lastAlertLevel: last?.batteryLevel,
      notificationsEnabled: true,
      notifyLowBattery: true,
    });
    if (!raise) return;

    const at = membership.latestLocation;
    return this.alerts.raise({
      type: 'low_battery',
      userId: user.id,
      familyId: membership.familyId,
      message: `User ${user.name} has low battery: ${level}%`,
      latitude: at.latitude,
      longitude: at.longitude,
      accuracy: at.accuracy,
      speed: at.speed,
      heading: at.heading,
      locationTimestamp: at.timestamp,
      batteryLevel: level,
    });
  }

  private async visibleTo(userId: string): Promise<string[]> {
    const [peerIds, settings] = await Promise.all([
      this.families.peerUserIds(userId),
      this.privacy.findByUserId(userId),
    ]);
    return resolveVisibleTo({ userId, peerIds, settings, now: new Date() });
  }

  private async assertMaySee(viewerId: string, userId: string): Promise<void> {
    if (viewerId === userId) return;
    if (!(await this.families.peerUserIds(viewerId)).includes(userId)) {
      throw new ForbiddenError('NOT_FAMILY_MEMBER', 'You can only view locations of your family members');
    }
  }
}

export type LocationPage = Page<LocationHistory>;
