import { Exclude } from 'class-transformer';
import {
  Unique,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Family } from '../../families/entities/family.entity';
import type { FamilyMember } from '../../families/entities/family-member.entity';
import type { PrivacySettings } from '../../privacy-settings/entities/privacy-settings.entity';
import type { Alert } from '../../alerts/entities/alert.entity';

export enum UserRole {
  Admin = 'admin',
  StandardUser = 'standard-user',
}

@Unique('UQ_user_google_subject', ['googleSubject'])
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  /** Null for accounts created through Google sign-in: they have no usable password. */
  @Column({ type: 'varchar', nullable: true })
  @Exclude({ toPlainOnly: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude({ toPlainOnly: true })
  googleSubject: string | null;

  @Column({ default: 'User' })
  name: string;

  @Column({ default: UserRole.StandardUser })
  userRole: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ default: true })
  hasNotificationsEnabled: boolean;

  @Column({ default: true })
  hasLocationEnabled: boolean;

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany('FamilyMember', 'user')
  familyMemberships: FamilyMember[];

  @OneToMany('Alert', 'user')
  alerts: Alert[];

  @Column({ nullable: true })
  stripeCustomerId?: string;

  @Column({ nullable: true })
  stripeSubscriptionId?: string;

  @Column({ nullable: true, type: 'timestamp' })
  subscriptionValidUntil?: Date | null;

  @OneToOne('PrivacySettings', 'user', {
    cascade: true,
    eager: true,
  })
  privacySettings: PrivacySettings;

  @OneToMany('Family', 'owner')
  ownedFamilies: Family[];
}
