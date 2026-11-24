import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/** A remembered response for one (user, route, Idempotency-Key). Rows older than 24 hours are purged. */
@Entity('idempotency_keys')
@Unique('UQ_idempotency_user_scope_key', ['userId', 'scope', 'key'])
@Index('IDX_idempotency_created', ['createdAt'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'varchar' })
  userId: string;

  /** HTTP method and route pattern, so one key can be reused on different endpoints. */
  @Column({ type: 'varchar' })
  scope: string;

  @Column({ type: 'varchar', length: 64 })
  requestHash: string;

  /** Null while the first request is still running. */
  @Column({ type: 'int', nullable: true })
  status: number | null;

  @Column({ type: 'jsonb', nullable: true })
  response: unknown;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
