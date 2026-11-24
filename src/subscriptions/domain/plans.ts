export type PlanId = 'free' | 'premium';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  features: string[];
  isPopular?: boolean;
}

export const PLANS: readonly Plan[] = [
  { id: 'free', name: 'Free', price: 0, features: ['Basic tracking'] },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    features: ['Real-time location', 'Safe zones', 'Battery alerts'],
    isPopular: true,
  },
];

export const PREMIUM_PERIOD_DAYS = 30;

export function findPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function planForUser(user: { isPremium: boolean }): Plan {
  return PLANS.find((p) => p.id === (user.isPremium ? 'premium' : 'free')) as Plan;
}

export function premiumValidUntil(from: Date): Date {
  return new Date(from.getTime() + PREMIUM_PERIOD_DAYS * 24 * 60 * 60 * 1000);
}
