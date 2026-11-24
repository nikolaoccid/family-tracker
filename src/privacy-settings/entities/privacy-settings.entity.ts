import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { SharingSchedule } from '../../sharing-schedules/entities/sharing-schedule.entity';

@Entity()
export class PrivacySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: true })
  locationSharingEnabled: boolean;

  @Column({ type: 'enum', enum: ['all', 'selected', 'none'], default: 'all' })
  visibleTo: 'all' | 'selected' | 'none';

  @Column('simple-array', { default: '' }) // comma-separated user IDs
  selectedMembers: string[];

  @OneToMany('SharingSchedule', 'privacySettings', {
    cascade: true,
    eager: true,
  })
  schedules: SharingSchedule[];

  @Column({ default: true })
  notificationsEnabled: boolean;

  @Column({ default: true })
  notifyLowBattery: boolean;

  @Column({ default: true })
  notifyZoneEntry: boolean;

  @Column({ default: true })
  notifyZoneExit: boolean;

  @OneToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
