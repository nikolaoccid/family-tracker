import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '../common/errors/domain-error';
import { Page, PageRequest, toPage } from '../common/pagination/pagination';
import { MAX_PAGE_LIMIT } from '../common/pagination/page-query.dto';
import { FamiliesService } from '../families';
import { filterVisitsByRange, summarizeVisits } from './domain/aggregate';
import { ZoneAnalytics } from './entities/zone-analytics.entity';
import { ZoneVisit } from './entities/zone-visit.entity';

export interface ZoneRef {
  id: string;
  name: string;
}
export interface MemberRef {
  id: string;
  name: string;
}

@Injectable()
export class ZoneAnalyticsService {
  constructor(
    @InjectRepository(ZoneAnalytics) private readonly analytics: Repository<ZoneAnalytics>,
    @InjectRepository(ZoneVisit) private readonly visits: Repository<ZoneVisit>,
    private readonly families: FamiliesService,
  ) {}

  async forZone(viewerId: string, zoneId: string, userId: string, startDate?: string, endDate?: string) {
    await this.assertMaySee(viewerId, userId);
    const record = await this.analytics.findOne({ where: { zoneId, userId } });
    if (!record)
      throw new NotFoundError('ANALYTICS_NOT_FOUND', `Analytics not found for zone ${zoneId} and user ${userId}`);

    const visits = filterVisitsByRange(await this.loadVisits([record.id]), startDate, endDate).map(withoutOwner);
    if (visits.length === 0) {
      throw new NotFoundError(
        'NO_VISITS',
        `No visits found for zone ${zoneId} and user ${userId} in the selected date range.`,
      );
    }
    return {
      zoneId,
      userId,
      zoneName: record.zoneName,
      userName: record.userName,
      ...summarizeVisits(visits, new Date()),
      visits,
    };
  }

  async summaryForUser(viewerId: string, userId: string, startDate?: string, endDate?: string) {
    await this.assertMaySee(viewerId, userId);
    const records = await this.analytics.find({ where: { userId }, take: MAX_PAGE_LIMIT });
    const all = await this.loadVisits(records.map((r) => r.id));
    const now = new Date();

    return records.flatMap((record) => {
      const visits = filterVisitsByRange(
        all.filter((v) => v.analytics.id === record.id),
        startDate,
        endDate,
      );
      if (visits.length === 0) return [];
      return [
        {
          zoneId: record.zoneId,
          zoneName: record.zoneName,
          userId,
          userName: record.userName,
          ...summarizeVisits(visits, now),
          visits: visits.map(withoutOwner),
        },
      ];
    });
  }

  async visitsForUser(viewerId: string, userId: string, { limit, after }: PageRequest): Promise<Page<ZoneVisitView>> {
    await this.assertMaySee(viewerId, userId);
    const qb = this.visits
      .createQueryBuilder('v')
      .innerJoinAndSelect('v.analytics', 'a')
      .where('a.userId = :userId', { userId })
      .orderBy('v.entryTime', 'DESC')
      .addOrderBy('v.id', 'DESC');
    if (after) qb.andWhere('(v.entryTime, v.id) < (:ts, :id)', { ts: after[0], id: after[1] });
    const rows = await qb.take(limit + 1).getMany();
    const page = toPage(rows, limit, (v) => [v.entryTime.toISOString(), v.id]);
    return {
      nextCursor: page.nextCursor,
      items: page.items.map((v) => ({
        zoneId: v.analytics.zoneId,
        zoneName: v.analytics.zoneName,
        entryTime: v.entryTime,
        exitTime: v.exitTime,
        duration: v.duration,
      })),
    };
  }

  async recordEntry(member: MemberRef, zone: ZoneRef, at: Date): Promise<void> {
    const record =
      (await this.analytics.findOneBy({ userId: member.id, zoneId: zone.id })) ??
      (await this.analytics.save(
        this.analytics.create({
          userId: member.id,
          userName: member.name,
          zoneId: zone.id,
          zoneName: zone.name,
          totalTimeSpent: 0,
          timeByDay: [],
        }),
      ));
    await this.visits.save(this.visits.create({ entryTime: at, analytics: record }));
  }

  async recordExit(member: MemberRef, zone: ZoneRef, at: Date): Promise<void> {
    const record = await this.analytics.findOneBy({ userId: member.id, zoneId: zone.id });
    if (!record) return;
    const open = await this.visits.findOne({
      where: { analytics: { id: record.id }, exitTime: IsNull() },
      order: { entryTime: 'DESC' },
    });
    if (!open) return;
    open.exitTime = at;
    open.duration = Math.floor((at.getTime() - open.entryTime.getTime()) / 60_000);
    await this.visits.save(open);
  }

  /** Visits for the given analytics rows, oldest first, capped so one account cannot load unbounded history. */
  private loadVisits(analyticsIds: string[]): Promise<ZoneVisit[]> {
    if (analyticsIds.length === 0) return Promise.resolve([]);
    return this.visits.find({
      where: { analytics: { id: In(analyticsIds) } },
      relations: ['analytics'],
      order: { entryTime: 'ASC' },
      take: MAX_PAGE_LIMIT,
    });
  }

  private async assertMaySee(viewerId: string, userId: string): Promise<void> {
    if (viewerId === userId) return;
    const peers = await this.families.peerUserIds(viewerId);
    if (!peers.includes(userId)) {
      throw new ForbiddenError('NOT_FAMILY_MEMBER', 'You can only view analytics of your family members');
    }
  }
}

function withoutOwner({ analytics: _owner, ...visit }: ZoneVisit) {
  return visit;
}

export interface ZoneVisitView {
  zoneId: string;
  zoneName: string;
  entryTime: Date;
  exitTime?: Date;
  duration?: number | null;
}
