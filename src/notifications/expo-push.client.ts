import { Injectable, Logger } from '@nestjs/common';
import { HttpClient } from '../common/http/http-client';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;
const TOKEN_PREFIX = 'ExponentPushToken';

export interface PushMessage {
  title: string;
  body: string;
}

/** Typed client for the Expo push service. Delivery is best effort: failures are logged, never thrown. */
@Injectable()
export class ExpoPushClient {
  private readonly logger = new Logger(ExpoPushClient.name);

  constructor(private readonly http: HttpClient) {}

  async send(tokens: string[], message: PushMessage): Promise<void> {
    const valid = [...new Set(tokens)].filter((t) => t.startsWith(TOKEN_PREFIX));
    for (let i = 0; i < valid.length; i += EXPO_BATCH_SIZE) {
      const batch = valid.slice(i, i + EXPO_BATCH_SIZE);
      try {
        // Not retried: a repeated push would reach people twice.
        await this.http.request(EXPO_PUSH_URL, {
          method: 'POST',
          body: { to: batch, sound: 'default', ...message },
          timeoutMs: 5_000,
        });
      } catch (error) {
        this.logger.warn({ err: error }, 'Push delivery failed');
      }
    }
  }
}
