import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { Readiness } from './readiness';

@Module({ imports: [TerminusModule], controllers: [HealthController], providers: [Readiness] })
export class HealthModule {}
