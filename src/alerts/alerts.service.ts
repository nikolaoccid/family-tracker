import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page, PageRequest, toPage } from '../common/pagination/pagination';
import { FamiliesService } from '../families';
import { NotificationsService } from '../notifications';
import { Alert, AlertType } from './entities/alert.entity';

export interface AlertDraft {
  type: AlertType;
  userId: string;
  familyId: string;
  message: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  locationTimestamp?: Date;
  batteryLevel?: number;
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert) private readonly alerts: Repository<Alert>,
    private readonly families: FamiliesService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Alerts of a family raised by other members, newest first. */
  async listForViewer(familyId: string, viewerId: string, { limit, after }: PageRequest): Promise<Page<Alert>> {
    await this.families.assertMember(familyId, viewerId);
    const qb = this.alerts
      .createQueryBuilder('alert')
      .where('alert.familyId = :familyId', { familyId })
      .andWhere('alert.userId != :viewerId', { viewerId })
      .orderBy('alert.timestamp', 'DESC')
      .addOrderBy('alert.id', 'DESC');
    if (after) qb.andWhere('(alert.timestamp, alert.id) < (:ts, :id)', { ts: after[0], id: after[1] });
    const rows = await qb.take(limit + 1).getMany();
    return toPage(rows, limit, (a) => [a.timestamp.toISOString(), a.id]);
  }

  assertCanRaise(familyId: string, userId: string): Promise<unknown> {
    return this.families.assertMember(familyId, userId);
  }

  /** Stores the alert and tells the rest of the family. */
  async raise(draft: AlertDraft): Promise<Alert> {
    const alert = await this.alerts.save(this.alerts.create(draft));
    await this.notifications.notifyFamily(draft.familyId, draft.userId, draft.message);
    return alert;
  }

  lastOfType(userId: string, type: AlertType): Promise<Alert | null> {
    return this.alerts.findOne({ where: { userId, type }, order: { locationTimestamp: 'DESC' } });
  }

  /** Deleting an alert that is already gone is not an error. */
  async remove(alertId: string, actorId: string) {
    const alert = await this.alerts.findOneBy({ id: alertId });
    if (alert) await this.families.assertMember(alert.familyId, actorId);
    return this.alerts.delete(alertId);
  }
}
