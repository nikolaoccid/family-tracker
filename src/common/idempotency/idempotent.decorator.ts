import { UseInterceptors, applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { IdempotencyInterceptor } from './idempotency.interceptor';

/** Honours the optional `Idempotency-Key` header on a create endpoint. */
export const Idempotent = () =>
  applyDecorators(
    UseInterceptors(IdempotencyInterceptor),
    ApiHeader({
      name: 'Idempotency-Key',
      required: false,
      description: 'Repeats within 24 hours return the first response.',
    }),
  );
