import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamiliesModule } from '../families';
import { ZoneAnalytics } from './entities/zone-analytics.entity';
import { ZoneVisit } from './entities/zone-visit.entity';
import { ZoneAnalyticsController } from './zone-analytics.controller';
import { ZoneAnalyticsService } from './zone-analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([ZoneAnalytics, ZoneVisit]), FamiliesModule],
  controllers: [ZoneAnalyticsController],
  providers: [ZoneAnalyticsService],
  exports: [ZoneAnalyticsService],
})
export class ZoneAnalyticsModule {}
