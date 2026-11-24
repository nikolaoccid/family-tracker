import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { Public } from '../common/auth/public.decorator';
import { Readiness } from './readiness';

@Controller('health')
@ApiTags('Health')
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly readiness: Readiness,
  ) {}

  /** Legacy route kept for existing monitors. */
  @Get()
  legacy(): { status: string } {
    return { status: 'ok' };
  }

  @Get('live')
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    if (this.readiness.isShuttingDown) throw new ServiceUnavailableException('Shutting down');
    return this.health.check([() => this.db.pingCheck('database', { timeout: 2_000 })]);
  }
}
