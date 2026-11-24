import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotFoundError } from '../common/errors/domain-error';
import { MAX_PAGE_LIMIT } from '../common/pagination/page-query.dto';
import { Page, PageRequest, toPage } from '../common/pagination/pagination';
import { FamiliesService } from '../families';
import { CreateSafeZoneDto, UpdateSafeZoneDto } from './dto/safe-zone.dto';
import { SafeZone } from './entities/safe-zone.entity';

@Injectable()
export class SafeZonesService {
  constructor(
    @InjectRepository(SafeZone) private readonly zones: Repository<SafeZone>,
    private readonly families: FamiliesService,
  ) {}

  async listForFamily(familyId: string, viewerId: string, { limit, after }: PageRequest): Promise<Page<SafeZone>> {
    await this.families.assertMember(familyId, viewerId);
    const qb = this.zones
      .createQueryBuilder('z')
      .where('z.familyId = :familyId', { familyId })
      .orderBy('z.createdAt', 'ASC')
      .addOrderBy('z.id', 'ASC');
    if (after) qb.andWhere('(z.createdAt, z.id) > (:ts, :id)', { ts: after[0], id: after[1] });
    const rows = await qb.take(limit + 1).getMany();
    return toPage(rows, limit, (z) => [z.createdAt.toISOString(), z.id]);
  }

  async get(id: string, viewerId: string): Promise<SafeZone> {
    const zone = await this.require(id);
    await this.families.assertMember(zone.familyId, viewerId);
    return zone;
  }

  async create(dto: CreateSafeZoneDto, actorId: string): Promise<SafeZone> {
    await this.families.assertMember(dto.familyId, actorId);
    return this.zones.save(this.zones.create(dto));
  }

  async update(id: string, dto: UpdateSafeZoneDto, actorId: string): Promise<SafeZone> {
    await this.get(id, actorId);
    const { name, color, radius, centerLatitude, centerLongitude, membersToTrack, isActive } = dto;
    await this.zones.update(id, { name, color, radius, centerLatitude, centerLongitude, membersToTrack, isActive });
    return this.require(id);
  }

  async setActive(id: string, isActive: boolean, actorId: string) {
    await this.get(id, actorId);
    return this.zones.update(id, { isActive });
  }

  async remove(id: string, actorId: string) {
    const zone = await this.zones.findOneBy({ id });
    if (zone) await this.families.assertMember(zone.familyId, actorId);
    return this.zones.delete(id);
  }

  /** Active zones of a family that track the given user. */
  async trackedZones(familyId: string, userId: string): Promise<SafeZone[]> {
    const zones = await this.zones.find({ where: { familyId, isActive: true }, take: MAX_PAGE_LIMIT });
    return zones.filter((zone) => zone.membersToTrack.includes(userId));
  }

  findByIds(ids: string[]): Promise<SafeZone[]> {
    return ids.length ? this.zones.find({ where: { id: In(ids) }, take: MAX_PAGE_LIMIT }) : Promise.resolve([]);
  }

  private async require(id: string): Promise<SafeZone> {
    const zone = await this.zones.findOneBy({ id });
    if (!zone) throw new NotFoundError('ZONE_NOT_FOUND', 'Safe zone not found');
    return zone;
  }
}
