import { Injectable } from '@nestjs/common';
import { FamiliesService } from '../families';
import { ExpoPushClient } from './expo-push.client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly families: FamiliesService,
    private readonly push: ExpoPushClient,
  ) {}

  /** Pushes a message to everyone in the family except the sender. */
  async notifyFamily(familyId: string, senderId: string, body: string, title = 'New alert'): Promise<void> {
    const tokens = await this.families.pushTokensForFamily(familyId, senderId);
    await this.push.send(tokens, { title, body });
  }

  registerToken(userId: string, token: string): Promise<void> {
    return this.families.registerPushToken(userId, token);
  }
}
