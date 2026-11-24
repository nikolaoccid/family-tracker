import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import type { User } from '../../users/entities/user.entity';

@Index('IDX_location_history_user_time', ['userId', 'timestamp'])
@Check('CHK_location_history_coords', '"latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180')
@Entity('location_history')
export class LocationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @Column('float', { nullable: true })
  accuracy?: number;

  @Column('float', { nullable: true })
  speed?: number;

  @Column('float', { nullable: true })
  heading?: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column('simple-array', { nullable: true })
  whoCanSeeLocation?: string[];
}
