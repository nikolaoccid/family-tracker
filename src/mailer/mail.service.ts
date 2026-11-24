import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { MailTokenService } from './mail-token.service';
import { MailTemplate, MailTemplateService } from './template.service';

/** Sends the transactional emails. Takes addresses as arguments so it never needs the users module. */
@Injectable()
export class MailService {
  constructor(
    private readonly mailer: MailerService,
    private readonly templates: MailTemplateService,
    private readonly tokens: MailTokenService,
  ) {}

  sendConfirmAccountEmail(userId: string, email: string) {
    const token = this.tokens.sign(userId);
    return this.send(email, this.templates.buildConfirmAccountTemplate(userId, token));
  }

  sendResetPasswordEmail(userId: string, email: string) {
    const token = this.tokens.sign(userId);
    return this.send(email, this.templates.buildResetPasswordTemplate(userId, token));
  }

  sendFamilyInvitationEmail(invitedEmail: string, familyId: string) {
    const token = this.tokens.signFamilyInvite(familyId, invitedEmail);
    return this.send(invitedEmail, this.templates.buildFamilyInviteTemplate(invitedEmail, token));
  }

  private send(to: string, template: MailTemplate) {
    return this.mailer.sendMail({
      to,
      subject: template.subject,
      template: template.template,
      context: template.context,
    });
  }
}
