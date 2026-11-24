import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import type { ZoneAnalytics } from './zone-analytics.entity';

@Index('IDX_zone_visit_analytics_entry', ['analytics', 'entryTime'])
@Entity('zone_visit')
export class ZoneVisit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz' })
  entryTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  exitTime?: Date;

  @Column({ type: 'int', nullable: true })
  duration?: number | null;

  @ManyToOne('ZoneAnalytics', 'visits')
  analytics: ZoneAnalytics;
}
