import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import type { Family } from '../../families/entities/family.entity';

@Index('IDX_safe_zones_family', ['familyId'])
@Check('CHK_safe_zones_radius', '"radius" > 0')
@Check('CHK_safe_zones_center', '"center_latitude" BETWEEN -90 AND 90 AND "center_longitude" BETWEEN -180 AND 180')
@Entity('safe_zones')
export class SafeZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  color: string;

  @Column('float')
  radius: number;

  @Column('float')
  centerLatitude: number;

  @Column('float')
  centerLongitude: number;

  @Column('simple-array') // Stores user IDs as comma-separated strings
  membersToTrack: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('Family', 'safeZones', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'familyId' })
  family: Family;

  @Column()
  familyId: string;
}
