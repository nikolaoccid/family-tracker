import { Global, Module } from '@nestjs/common';
import { BreakerRegistry } from './circuit-breaker';
import { HttpClient } from './http-client';

@Global()
@Module({
  providers: [{ provide: BreakerRegistry, useFactory: () => new BreakerRegistry() }, HttpClient],
  exports: [BreakerRegistry, HttpClient],
})
export class HttpModule {}
