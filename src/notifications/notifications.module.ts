import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families';
import { ExpoPushClient } from './expo-push.client';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [FamiliesModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, ExpoPushClient],
  exports: [NotificationsService],
})
export class NotificationsModule {}
