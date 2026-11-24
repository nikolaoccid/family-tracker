import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharingSchedule } from './entities/sharing-schedule.entity';
import { SharingSchedulesController } from './sharing-schedules.controller';
import { SharingSchedulesService } from './sharing-schedules.service';

@Module({
  imports: [TypeOrmModule.forFeature([SharingSchedule])],
  controllers: [SharingSchedulesController],
  providers: [SharingSchedulesService],
  exports: [SharingSchedulesService],
})
export class SharingSchedulesModule {}
