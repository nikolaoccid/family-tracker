import { Body, Controller, Get, Put } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import type { User } from '../users';
import { UpdatePrivacySettingsDto } from './dto/privacy-settings.dto';
import { PrivacySettingsService } from './privacy-settings.service';

@Controller('privacy-settings')
export class PrivacySettingsController {
  constructor(private readonly privacy: PrivacySettingsService) {}

  @Get()
  get(@AuthenticatedUser() user: User) {
    return this.privacy.getByUserId(user.id);
  }

  @Put()
  update(@AuthenticatedUser() user: User, @Body() dto: UpdatePrivacySettingsDto) {
    return this.privacy.update(user.id, dto);
  }
}
