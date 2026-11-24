import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MailService } from '../mailer';
import { SendConfirmationDto } from './dto/user.dto';
import { UsersService } from './users.service';

/** Kept under /mail for existing clients; lives here because it needs the user's address. */
@Controller('mail')
export class AccountMailController {
  constructor(
    private readonly mail: MailService,
    private readonly users: UsersService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('send')
  async sendConfirmation(@Body() dto: SendConfirmationDto) {
    const user = await this.users.requireById(dto.userId);
    return this.mail.sendConfirmAccountEmail(user.id, user.email);
  }
}
