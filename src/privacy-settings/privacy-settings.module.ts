import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharingSchedulesModule } from '../sharing-schedules';
import { PrivacySettings } from './entities/privacy-settings.entity';
import { PrivacySettingsController } from './privacy-settings.controller';
import { PrivacySettingsService } from './privacy-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([PrivacySettings]), SharingSchedulesModule],
  controllers: [PrivacySettingsController],
  providers: [PrivacySettingsService],
  exports: [PrivacySettingsService],
})
export class PrivacySettingsModule {}
