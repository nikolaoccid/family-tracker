import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import { pageRequest, sendPage } from '../common/pagination/pagination';
import { PageQueryDto } from '../common/pagination/page-query.dto';
import type { User } from '../users';
import { SharingScheduleInputDto, UpdateSharingScheduleDto } from './dto/sharing-schedule.dto';
import { SharingSchedule } from './entities/sharing-schedule.entity';
import { SharingSchedulesService } from './sharing-schedules.service';

@Controller('sharing-schedules')
@ApiTags('Sharing Schedules')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class SharingSchedulesController {
  constructor(private readonly schedules: SharingSchedulesService) {}

  @Post()
  create(@Body() dto: SharingScheduleInputDto, @AuthenticatedUser() user: User): Promise<SharingSchedule> {
    return this.schedules.create(dto, user);
  }

  @Get()
  async findAll(
    @AuthenticatedUser() user: User,
    @Query() query: PageQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SharingSchedule[]> {
    return sendPage(res, await this.schedules.findAll(user.id, pageRequest(query)));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @AuthenticatedUser() user: User): Promise<SharingSchedule> {
    return this.schedules.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSharingScheduleDto,
    @AuthenticatedUser() user: User,
  ): Promise<SharingSchedule> {
    return this.schedules.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @AuthenticatedUser() user: User): Promise<void> {
    return this.schedules.remove(id, user.id);
  }
}
