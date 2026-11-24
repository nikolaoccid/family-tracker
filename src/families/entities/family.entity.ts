import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { FamilyMember } from './family-member.entity';
import type { SafeZone } from '../../safe-zones/entities/safe-zone.entity';
import type { Alert } from '../../alerts/entities/alert.entity';

@Entity('families')
export class Family {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany('FamilyMember', 'family', { eager: false })
  members: FamilyMember[];

  @OneToMany('SafeZone', 'family')
  safeZones: SafeZone[];

  @OneToMany('Alert', 'family')
  alerts: Alert[];
}
