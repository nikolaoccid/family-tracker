import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { NotFoundError } from '../common/errors/domain-error';
import type { User } from '../users';
import { Page, PageRequest, toPage } from '../common/pagination/pagination';
import { SharingScheduleInputDto, UpdateSharingScheduleDto } from './dto/sharing-schedule.dto';
import { SharingSchedule } from './entities/sharing-schedule.entity';

/** Only the editable fields; ids and timestamps the app echoes back are not ours to accept. */
function scheduleFields({ name, days, startTime, endTime, enabled }: SharingScheduleInputDto) {
  return { name, days, startTime, endTime, enabled };
}

@Injectable()
export class SharingSchedulesService {
  constructor(@InjectRepository(SharingSchedule) private readonly schedules: Repository<SharingSchedule>) {}

  /** The response embeds the owner, as it always has; the app contract keeps that field. */
  create(dto: SharingScheduleInputDto, user: User): Promise<SharingSchedule> {
    return this.schedules.save(this.schedules.create({ ...scheduleFields(dto), user }));
  }

  async findAll(userId: string, { limit, after }: PageRequest): Promise<Page<SharingSchedule>> {
    const qb = this.schedules
      .createQueryBuilder('s')
      .where('s.user = :userId', { userId })
      .orderBy('s.createdAt', 'ASC')
      .addOrderBy('s.id', 'ASC');
    if (after) qb.andWhere('(s.createdAt, s.id) > (:ts, :id)', { ts: after[0], id: after[1] });
    const rows = await qb.take(limit + 1).getMany();
    return toPage(rows, limit, (s) => [s.createdAt.toISOString(), s.id]);
  }

  async findOne(id: string, userId: string): Promise<SharingSchedule> {
    const schedule = await this.schedules.findOne({ where: { id, user: { id: userId } } });
    if (!schedule) throw new NotFoundError('SCHEDULE_NOT_FOUND', 'Sharing schedule not found');
    return schedule;
  }

  async update(id: string, dto: UpdateSharingScheduleDto, userId: string): Promise<SharingSchedule> {
    const schedule = await this.findOne(id, userId);
    Object.assign(schedule, dto);
    return this.schedules.save(schedule);
  }

  /** Deleting something that is already gone is not an error. */
  async remove(id: string, userId: string): Promise<void> {
    const schedule = await this.schedules.findOne({ where: { id, user: { id: userId } } });
    if (schedule) await this.schedules.remove(schedule);
  }

  /** Builds (without saving) the schedules that replace a user's privacy-settings schedules. */
  buildForSettings(userId: string, inputs: SharingScheduleInputDto[]): SharingSchedule[] {
    return inputs.map((input) => this.schedules.create({ ...scheduleFields(input), user: { id: userId } }));
  }

  /** Pass the caller's transaction manager to make the delete part of it. */
  async deleteForSettings(settingsId: string, manager: EntityManager = this.schedules.manager): Promise<void> {
    await manager.delete(SharingSchedule, { privacySettings: { id: settingsId } });
  }
}
