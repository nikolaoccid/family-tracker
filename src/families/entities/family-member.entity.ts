import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { Family } from './family.entity';
import type { LocationHistory } from '../../locations/entities/location-history.entity';

export type MemberRole = 'admin' | 'member';
@Index('IDX_family_members_family', ['familyId'])
@Index('IDX_family_members_user', ['userId'])
@Index('UQ_family_members_family_user', ['familyId', 'userId'], { unique: true, where: '"user_id" IS NOT NULL' })
@Index('UQ_family_members_family_invite', ['familyId', 'invitedEmail'], {
  unique: true,
  where: '"invited_email" IS NOT NULL',
})
@Entity('family_members')
export class FamilyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne('Family', 'members', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @Column('uuid', { name: 'family_id' })
  familyId: string;

  @ManyToOne('User', 'familyMemberships', {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column('uuid', { name: 'user_id', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', nullable: true })
  invitedEmail: string | null;

  @Column({ type: 'enum', enum: ['admin', 'member'], default: 'member' })
  role: MemberRole;

  @Column({ default: true })
  isSharing: boolean;

  @Column({ type: 'float', nullable: true })
  batteryLevel?: number | null;

  @Column({ nullable: true })
  lastSeen?: Date;

  @Column({ type: 'float', nullable: true })
  latitude?: number;

  @Column({ type: 'float', nullable: true })
  longitude?: number;

  @Column({ type: 'timestamp', nullable: true })
  locationTimestamp?: Date;

  @Column({ type: 'float', nullable: true })
  accuracy?: number;

  @Column({ type: 'float', nullable: true })
  speed?: number;

  @Column({ type: 'float', nullable: true })
  heading?: number;

  @Column({ type: 'simple-array', nullable: true })
  pushTokens?: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  activeZones?: string[] | null;

  @ManyToOne('LocationHistory', {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'latest_location_id' })
  latestLocation?: LocationHistory;

  @Column({ name: 'latest_location_id', type: 'uuid', nullable: true })
  latestLocationId?: string;
}
