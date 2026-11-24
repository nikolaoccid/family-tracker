import { PLANS, findPlan, planForUser, premiumValidUntil } from './plans';

describe('plans', () => {
  it('offers free and premium', () => {
    expect(PLANS.map((p) => p.id)).toEqual(['free', 'premium']);
  });

  it('finds plans by id', () => {
    expect(findPlan('premium')?.price).toBe(9.99);
    expect(findPlan('gold')).toBeUndefined();
  });

  it('maps the premium flag to a plan', () => {
    expect(planForUser({ isPremium: true }).id).toBe('premium');
    expect(planForUser({ isPremium: false }).id).toBe('free');
  });

  it('grants thirty days', () => {
    const from = new Date('2026-03-01T00:00:00Z');
    expect(premiumValidUntil(from).toISOString()).toBe('2026-03-31T00:00:00.000Z');
  });
});
