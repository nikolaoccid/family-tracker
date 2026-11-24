import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import type { ZoneVisit } from './zone-visit.entity';

@Index('UQ_zone_analytics_user_zone', ['userId', 'zoneId'], { unique: true })
@Entity('zone_analytics')
export class ZoneAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  zoneId: string;

  @Column()
  zoneName: string;

  @Column()
  userId: string;

  @Column()
  userName: string;

  @Column()
  totalTimeSpent: number;

  @Column('jsonb')
  timeByDay: { date: string; minutes: number }[];

  @OneToMany('ZoneVisit', 'analytics', { cascade: true })
  visits: ZoneVisit[];
}
