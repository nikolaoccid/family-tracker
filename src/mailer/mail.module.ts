import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { AppConfig } from '../common/config/app-config';
import { MailTokenService } from './mail-token.service';
import { MailService } from './mail.service';
import { MailTemplateService } from './template.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        transport: {
          host: config.mail.host,
          port: config.mail.port,
          secure: true,
          auth: { user: config.mail.user, pass: config.mail.pass },
        },
        defaults: { from: config.mail.from },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [MailService, MailTemplateService, MailTokenService],
  exports: [MailService, MailTokenService],
})
export class MailModule {}
