import { Injectable } from '@nestjs/common';
import { InvalidError } from '../common/errors/domain-error';
import { UsersService } from '../users';
import type { User } from '../users';
import { PLANS, findPlan, planForUser, premiumValidUntil } from './domain/plans';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly users: UsersService) {}

  getPlans() {
    return PLANS;
  }

  current(user: User) {
    const plan = planForUser(user);
    return {
      plan: plan.id,
      name: plan.name,
      features: plan.features,
      price: plan.price,
      validUntil: user.subscriptionValidUntil,
    };
  }

  async subscribe(userId: string, planId: string) {
    const plan = findPlan(planId);
    if (!plan) throw new InvalidError('INVALID_PLAN', 'Invalid plan ID');
    const premium = plan.id === 'premium';
    await this.users.setPlan(userId, {
      isPremium: premium,
      validUntil: premium ? premiumValidUntil(new Date()) : null,
    });
    return { success: true, message: `Subscribed to ${plan.name}`, plan: plan.id };
  }

  /** Cancelling when already on the free plan changes nothing. */
  async cancel(userId: string) {
    await this.users.setPlan(userId, { isPremium: false, validUntil: null });
    return { success: true, message: 'Subscription canceled' };
  }
}
