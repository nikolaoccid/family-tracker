import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [FamiliesModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
