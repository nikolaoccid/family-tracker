import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import type { User } from '../users';
import { ChatService } from './chat.service';

@Controller('chat')
@ApiTags('Chat')
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('token')
  token(@AuthenticatedUser() user: User) {
    return { token: this.chat.tokenFor(user) };
  }
}
