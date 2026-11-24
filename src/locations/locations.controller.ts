import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import { pageRequest, sendPage } from '../common/pagination/pagination';
import type { User } from '../users';
import { UpdateBatteryDto } from './dto/battery.dto';
import { LocationDto, LocationHistoryQueryDto } from './dto/location.dto';
import { LocationsService } from './locations.service';

@Controller()
@ApiTags('Locations')
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Post('/location')
  report(@AuthenticatedUser() user: User, @Body() dto: LocationDto) {
    return this.locations.report(user, dto);
  }

  @Get('/family/:familyId/locations')
  familyLocations(@AuthenticatedUser() user: User, @Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.locations.familyLocations(familyId, user);
  }

  /** Both paths exist for existing app builds. */
  @Get(['/location/history/:userId', '/user/:userId/location-history'])
  async history(
    @AuthenticatedUser() viewer: User,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: LocationHistoryQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const page = await this.locations.historyFor(viewer.id, userId, query, pageRequest(query));
    return sendPage(res, page);
  }

  @Post('/user/battery')
  updateBattery(@AuthenticatedUser() user: User, @Body() dto: UpdateBatteryDto) {
    return this.locations.updateBattery(user, dto.level);
  }
}
