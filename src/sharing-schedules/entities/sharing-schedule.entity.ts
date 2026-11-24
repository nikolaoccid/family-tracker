import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { DayOfWeek } from '../domain/schedule-window';
import type { PrivacySettings } from '../../privacy-settings/entities/privacy-settings.entity';

@Entity()
export class SharingSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('simple-array')
  days: DayOfWeek[];

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column({ default: true })
  enabled: boolean;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne('PrivacySettings', 'schedules', {
    onDelete: 'CASCADE',
  })
  privacySettings: PrivacySettings;
}
