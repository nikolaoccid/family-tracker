import { Injectable } from '@nestjs/common';

const APP_SCHEME = 'app.familytracker://';

export interface MailTemplate {
  subject: string;
  template: string;
  context: { deepLink: string };
}

/** Builds the app deep links and picks the template for each email. */
@Injectable()
export class MailTemplateService {
  buildConfirmAccountTemplate(userId: string, token: string): MailTemplate {
    return this.build(
      'Confirm your Family Tracker account',
      'confirm-account',
      `confirm?userId=${userId}&token=${token}`,
    );
  }

  buildResetPasswordTemplate(userId: string, token: string): MailTemplate {
    return this.build(
      'Reset your Family Tracker password',
      'reset-password',
      `reset-password?userId=${userId}&token=${token}`,
    );
  }

  buildFamilyInviteTemplate(invitedEmail: string, token: string): MailTemplate {
    const query = `family-invite?invitedEmail=${encodeURIComponent(invitedEmail)}&token=${token}`;
    return this.build('You have been invited to join a Family Tracker family', 'join-family', query);
  }

  private build(subject: string, template: string, path: string): MailTemplate {
    return { subject, template, context: { deepLink: `${APP_SCHEME}${path}` } };
  }
}
