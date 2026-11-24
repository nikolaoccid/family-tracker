import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Idempotent } from '../common/idempotency/idempotent.decorator';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import { pageRequest, sendPage } from '../common/pagination/pagination';
import { PageQueryDto } from '../common/pagination/page-query.dto';
import type { User } from '../users';
import { CreateSafeZoneDto, ToggleSafeZoneStatusDto, UpdateSafeZoneDto } from './dto/safe-zone.dto';
import { SafeZonesService } from './safe-zones.service';

@Controller()
@ApiTags('Safe zones')
@ApiBearerAuth()
export class SafeZonesController {
  constructor(private readonly zones: SafeZonesService) {}

  @Get('/family/:familyId/safe-zones')
  async list(
    @AuthenticatedUser() user: User,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query() query: PageQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return sendPage(res, await this.zones.listForFamily(familyId, user.id, pageRequest(query)));
  }

  @Get('/safe-zone/:id')
  get(@AuthenticatedUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.zones.get(id, user.id);
  }

  @Idempotent()
  @Post('/safe-zone')
  create(@AuthenticatedUser() user: User, @Body() dto: CreateSafeZoneDto) {
    return this.zones.create(dto, user.id);
  }

  @Put('/safe-zone/:id')
  update(@AuthenticatedUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSafeZoneDto) {
    return this.zones.update(id, dto, user.id);
  }

  @Put('/safe-zone/:id/status')
  setStatus(
    @AuthenticatedUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleSafeZoneStatusDto,
  ) {
    return this.zones.setActive(id, dto.isActive, user.id);
  }

  @Delete('/safe-zone/:id')
  remove(@AuthenticatedUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.zones.remove(id, user.id);
  }
}
