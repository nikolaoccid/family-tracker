import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Idempotent } from '../common/idempotency/idempotent.decorator';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import { pageRequest, sendPage } from '../common/pagination/pagination';
import { PageQueryDto } from '../common/pagination/page-query.dto';
import type { User } from '../users';
import { AlertsService } from './alerts.service';
import { RaiseAlertDto } from './dto/alert.dto';

@Controller()
@ApiTags('Alerts')
@ApiBearerAuth()
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get('/family/:familyId/alerts')
  async list(
    @AuthenticatedUser() user: User,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query() query: PageQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return sendPage(res, await this.alerts.listForViewer(familyId, user.id, pageRequest(query)));
  }

  @Idempotent()
  @Post('alert/emergency')
  emergency(@AuthenticatedUser() user: User, @Body() dto: RaiseAlertDto) {
    return this.raise(user, dto, 'emergency', `Emergency alert for ${user.name}`);
  }

  @Idempotent()
  @Post('/alert/heading-home')
  headingHome(@AuthenticatedUser() user: User, @Body() dto: RaiseAlertDto) {
    return this.raise(user, dto, 'heading_home', `Heading home alert for ${user.name}`);
  }

  @Delete('/alert/:alertId')
  remove(@AuthenticatedUser() user: User, @Param('alertId', ParseUUIDPipe) alertId: string) {
    return this.alerts.remove(alertId, user.id);
  }

  private async raise(user: User, dto: RaiseAlertDto, type: 'emergency' | 'heading_home', message: string) {
    await this.alerts.assertCanRaise(dto.familyId, user.id);
    return this.alerts.raise({
      type,
      message,
      userId: user.id,
      familyId: dto.familyId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      speed: dto.speed,
      heading: dto.heading,
      locationTimestamp: dto.locationTimestamp ? new Date(dto.locationTimestamp) : undefined,
    });
  }
}
