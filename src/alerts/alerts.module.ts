import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamiliesModule } from '../families';
import { NotificationsModule } from '../notifications';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { Alert } from './entities/alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alert]), FamiliesModule, NotificationsModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
