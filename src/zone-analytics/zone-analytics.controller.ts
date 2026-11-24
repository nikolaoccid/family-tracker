import { Controller, Get, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import { pageRequest, sendPage } from '../common/pagination/pagination';
import { PageQueryDto } from '../common/pagination/page-query.dto';
import type { User } from '../users';
import { DateRangeDto } from './dto/date-range.dto';
import { ZoneAnalyticsService } from './zone-analytics.service';

@Controller('zone-analytics')
@ApiTags('Zone analytics')
@ApiBearerAuth()
export class ZoneAnalyticsController {
  constructor(private readonly analytics: ZoneAnalyticsService) {}

  // Static segments first: '/user/...' must not be captured by '/:zoneId/:userId'.
  @Get('/user/:userId/summary')
  summary(
    @AuthenticatedUser() viewer: User,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() range: DateRangeDto,
  ) {
    return this.analytics.summaryForUser(viewer.id, userId, range.startDate, range.endDate);
  }

  @Get('/user/:userId/visits')
  async visits(
    @AuthenticatedUser() viewer: User,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: PageQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return sendPage(res, await this.analytics.visitsForUser(viewer.id, userId, pageRequest(query)));
  }

  @Get('/:zoneId/:userId')
  forZone(
    @AuthenticatedUser() viewer: User,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() range: DateRangeDto,
  ) {
    return this.analytics.forZone(viewer.id, zoneId, userId, range.startDate, range.endDate);
  }
}
