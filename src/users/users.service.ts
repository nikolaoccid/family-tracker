import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page, PageRequest, toPage } from '../common/pagination/pagination';
import { InvalidError, NotFoundError } from '../common/errors/domain-error';
import { MailService, MailTokenService } from '../mailer';
import { PaymentsGateway } from '../payments';
import { PrivacySettingsService } from '../privacy-settings';
import { CreateUserDto, SetStripeSubscriptionDto, UpdateUserDto } from './dto/user.dto';
import { User } from './entities/user.entity';
import { HashService } from './hash.service';
import { pickProfileChanges } from './profile';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly hashService: HashService,
    private readonly mail: MailService,
    private readonly mailTokens: MailTokenService,
    private readonly privacySettings: PrivacySettingsService,
    private readonly payments: PaymentsGateway,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    return this.insert({
      email: dto.email,
      name: dto.name ?? 'User',
      passwordHash: await this.hashService.hashPassword(dto.password),
    });
  }

  /**
   * The account for a verified Google identity. Created without a password on first use; an existing
   * account with the same email is linked (Google verified the address).
   */
  async findOrCreateFromGoogle(identity: { subject: string; email: string; name: string }): Promise<User> {
    const bySubject = await this.users.findOneBy({ googleSubject: identity.subject });
    if (bySubject) return bySubject;
    const byEmail = await this.getByEmail(identity.email);
    if (byEmail) {
      await this.users.update(byEmail.id, { googleSubject: identity.subject });
      return this.requireById(byEmail.id);
    }
    return this.insert({
      email: identity.email,
      name: identity.name || 'User',
      passwordHash: null,
      googleSubject: identity.subject,
      isVerified: true,
    });
  }

  private async insert(fields: Partial<User>): Promise<User> {
    const saved = await this.users.save(this.users.create(fields));
    await this.privacySettings.createDefaults(saved);
    return saved;
  }

  async findAll({ limit, after }: PageRequest): Promise<Page<User>> {
    const qb = this.users.createQueryBuilder('user').orderBy('user.createdAt', 'ASC').addOrderBy('user.id', 'ASC');
    if (after) qb.where('(user.createdAt, user.id) > (:ts, :id)', { ts: after[0], id: after[1] });
    const rows = await qb.take(limit + 1).getMany();
    return toPage(rows, limit, (u) => [u.createdAt.toISOString(), u.id]);
  }

  getByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email });
  }

  getById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id }, relations: ['privacySettings'] });
  }

  async requireById(id: string): Promise<User> {
    const user = await this.getById(id);
    if (!user) throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    return user;
  }

  /** Always succeeds from the caller's view so the endpoint cannot be used to probe for accounts. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.getByEmail(email);
    if (user) await this.mail.sendResetPasswordEmail(user.id, user.email);
  }

  async completePasswordReset(token: string, newPassword: string) {
    let userId: string;
    try {
      userId = this.mailTokens.verify(token).userId;
    } catch {
      throw new InvalidError('INVALID_RESET_TOKEN', 'Invalid or expired token');
    }
    const user = await this.requireById(userId);
    user.passwordHash = await this.hashService.hashPassword(newPassword);
    await this.users.save(user);
    return { message: 'Password has been reset successfully', userId: user.id };
  }

  /**
   * Premium is granted only for a subscription Stripe confirms is active and belongs to this user's
   * customer. The period end comes from Stripe; the client's `subscriptionValidUntil` is ignored.
   */
  async setStripeSubscription(user: User, dto: SetStripeSubscriptionDto) {
    const sub = await this.payments.retrieveSubscription(dto.stripeSubscriptionId);
    const ownedByUser =
      !!sub && sub.customerId === dto.stripeCustomerId && sub.customerEmail?.toLowerCase() === user.email.toLowerCase();
    if (!sub || !ownedByUser || !sub.active) {
      throw new InvalidError(
        'SUBSCRIPTION_NOT_VERIFIED',
        'Stripe does not confirm an active subscription for this account',
      );
    }
    await this.users.update(user.id, {
      stripeCustomerId: sub.customerId,
      stripeSubscriptionId: dto.stripeSubscriptionId,
      subscriptionValidUntil: sub.currentPeriodEnd,
      isPremium: true,
    });
    return { success: true };
  }

  /** Deletes the account; the database removes the user's locations, alerts and visits with it. */
  async deleteAccount(userId: string): Promise<void> {
    await this.users.delete(userId);
  }

  /** Used by the subscriptions module for the in-app plan switch. */
  async setPlan(userId: string, plan: { isPremium: boolean; validUntil: Date | null }): Promise<void> {
    await this.users.update(userId, { isPremium: plan.isPremium, subscriptionValidUntil: plan.validUntil });
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.requireById(id);
    Object.assign(user, pickProfileChanges(dto));
    return this.users.save(user);
  }
}
