import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKey } from './idempotency-key.entity';

/** Registers the table; the interceptor itself only needs the global DataSource. */
@Module({ imports: [TypeOrmModule.forFeature([IdempotencyKey])] })
export class IdempotencyModule {}
