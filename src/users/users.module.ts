import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mailer';
import { PaymentsModule } from '../payments';
import { PrivacySettingsModule } from '../privacy-settings';
import { AccountMailController } from './account-mail.controller';
import { User } from './entities/user.entity';
import { HashService } from './hash.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MailModule, PrivacySettingsModule, PaymentsModule],
  controllers: [UsersController, AccountMailController],
  providers: [UsersService, HashService],
  exports: [UsersService, HashService],
})
export class UsersModule {}
