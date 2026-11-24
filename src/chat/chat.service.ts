import { Injectable, Logger } from '@nestjs/common';
import { StreamChat } from 'stream-chat';
import { AppConfig } from '../common/config/app-config';
import { FamiliesService } from '../families';
import type { User } from '../users';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly stream: StreamChat;

  constructor(
    config: AppConfig,
    private readonly families: FamiliesService,
  ) {
    this.stream = StreamChat.getInstance(config.stream.key, config.stream.secret);
  }

  /** Issues the chat token and, in the background, makes sure the user's family is known to the chat provider. */
  tokenFor(user: User): string {
    void this.syncFamily(user.id).catch((err: unknown) => this.logger.warn({ err }, 'Chat user sync failed'));
    return this.stream.createToken(user.id);
  }

  private async syncFamily(userId: string): Promise<void> {
    const membership = await this.families.findMembership(userId);
    if (!membership) return;
    const profiles = await this.families.memberProfiles(membership.familyId);
    await this.stream.upsertUsers(profiles);
  }
}
