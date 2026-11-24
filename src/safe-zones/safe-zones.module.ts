import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamiliesModule } from '../families';
import { SafeZone } from './entities/safe-zone.entity';
import { SafeZonesController } from './safe-zones.controller';
import { SafeZonesService } from './safe-zones.service';

@Module({
  imports: [TypeOrmModule.forFeature([SafeZone]), FamiliesModule],
  controllers: [SafeZonesController],
  providers: [SafeZonesService],
  exports: [SafeZonesService],
})
export class SafeZonesModule {}
