import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import type { User } from '../users';
import { NotificationsService } from './notifications.service';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('register')
  async register(@AuthenticatedUser() user: User, @Body() dto: RegisterPushTokenDto) {
    await this.notifications.registerToken(user.id, dto.token);
    return { message: 'Push token registered successfully' };
  }
}
