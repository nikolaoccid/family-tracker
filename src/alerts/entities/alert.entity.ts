import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { Family } from '../../families/entities/family.entity';

export type AlertType = 'emergency' | 'zone_exit' | 'zone_entry' | 'low_battery' | 'heading_home';

@Index('IDX_alerts_family_time', ['familyId', 'timestamp'])
@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['emergency', 'zone_exit', 'zone_entry', 'low_battery', 'heading_home'],
  })
  type: AlertType;

  @ManyToOne('User', 'alerts', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne('Family', 'alerts', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'familyId' })
  family: Family;

  @Column()
  familyId: string;

  @Column()
  message: string;

  @Column('float', { nullable: true })
  latitude?: number;

  @Column('float', { nullable: true })
  longitude?: number;

  @Column('float', { nullable: true })
  accuracy?: number;

  @Column('float', { nullable: true })
  speed?: number;

  @Column('float', { nullable: true })
  heading?: number;

  @Column({ type: 'timestamp', nullable: true })
  locationTimestamp?: Date;

  @Column({ type: 'float', nullable: true })
  batteryLevel?: number;

  @CreateDateColumn({ name: 'timestamp', type: 'timestamptz' })
  timestamp: Date;
}
