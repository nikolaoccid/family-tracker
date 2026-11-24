import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsModule } from '../alerts';
import { FamiliesModule } from '../families';
import { PrivacySettingsModule } from '../privacy-settings';
import { SafeZonesModule } from '../safe-zones';
import { ZoneAnalyticsModule } from '../zone-analytics';
import { LocationHistory } from './entities/location-history.entity';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { ZoneEventsService } from './zone-events.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationHistory]),
    FamiliesModule,
    PrivacySettingsModule,
    AlertsModule,
    SafeZonesModule,
    ZoneAnalyticsModule,
  ],
  controllers: [LocationsController],
  providers: [LocationsService, ZoneEventsService],
  exports: [LocationsService],
})
export class LocationsModule {}
