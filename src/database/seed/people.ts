import { hash } from 'bcrypt';
import { EntityManager } from 'typeorm';
import { Family } from '../../families/entities/family.entity';
import { FamilyMember } from '../../families/entities/family-member.entity';
import { PrivacySettings } from '../../privacy-settings/entities/privacy-settings.entity';
import { SafeZone } from '../../safe-zones/entities/safe-zone.entity';
import { SharingSchedule } from '../../sharing-schedules/entities/sharing-schedule.entity';
import type { DayOfWeek } from '../../sharing-schedules';
import { User } from '../../users/entities/user.entity';
import { DEMO_PASSWORD, DemoFamily, DemoUser, FAMILIES, PLACES, PlanState, USERS } from './fixtures';
import { stableUuid } from './prng';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SeededFamily {
  spec: DemoFamily;
  family: Family;
  members: FamilyMember[];
  zones: SafeZone[];
}

export interface People {
  users: Map<string, User>;
  specs: Map<string, DemoUser>;
  families: SeededFamily[];
  settings: Map<string, PrivacySettings>;
}

function subscriptionFor(plan: PlanState, now: Date): Partial<User> {
  switch (plan) {
    case 'premium-active':
      return {
        isPremium: true,
        subscriptionValidUntil: new Date(now.getTime() + 20 * DAY_MS),
        stripeCustomerId: 'cus_demo_active',
        stripeSubscriptionId: 'sub_demo_active',
      };
    case 'premium-expired':
      return {
        isPremium: true,
        subscriptionValidUntil: new Date(now.getTime() - 5 * DAY_MS),
        stripeCustomerId: 'cus_demo_expired',
        stripeSubscriptionId: 'sub_demo_expired',
      };
    case 'canceled':
      return {
        isPremium: false,
        subscriptionValidUntil: null,
        stripeCustomerId: 'cus_demo_canceled',
        stripeSubscriptionId: undefined,
      };
    default:
      return { isPremium: false, subscriptionValidUntil: null };
  }
}

export async function createPeople(em: EntityManager, now: Date): Promise<People> {
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const users = new Map<string, User>();
  const specs = new Map(USERS.map((u) => [u.key, u]));

  for (const spec of USERS) {
    users.set(
      spec.key,
      await em.save(
        em.create(User, {
          id: stableUuid(`user:${spec.key}`),
          email: spec.email,
          name: spec.name,
          passwordHash,
          isVerified: true,
          ...subscriptionFor(spec.plan, now),
        }),
      ),
    );
  }

  const settings = new Map<string, PrivacySettings>();
  for (const spec of USERS) {
    const user = users.get(spec.key) as User;
    const saved = await em.save(
      em.create(PrivacySettings, {
        user,
        visibleTo: spec.visibleTo,
        selectedMembers: (spec.selected ?? []).map((k) => (users.get(k) as User).id),
        locationSharingEnabled: spec.visibleTo !== 'none',
      }),
    );
    if (spec.schedule) {
      saved.schedules = [
        await em.save(
          em.create(SharingSchedule, {
            ...spec.schedule,
            days: spec.schedule.days as DayOfWeek[],
            enabled: true,
            user,
            privacySettings: saved,
          }),
        ),
      ];
    }
    settings.set(spec.key, saved);
  }

  const families: SeededFamily[] = [];
  for (const spec of FAMILIES) {
    const owner = users.get(spec.admins[0]) as User;
    const family = await em.save(
      em.create(Family, { id: stableUuid(`family:${spec.name}`), name: spec.name, ownerId: owner.id }),
    );
    const members = [
      ...spec.admins.map((k) =>
        em.create(FamilyMember, { familyId: family.id, userId: (users.get(k) as User).id, role: 'admin' as const }),
      ),
      ...spec.members.map((k) =>
        em.create(FamilyMember, { familyId: family.id, userId: (users.get(k) as User).id, role: 'member' as const }),
      ),
      ...(spec.invited ?? []).map((email) =>
        em.create(FamilyMember, { familyId: family.id, invitedEmail: email, role: 'member' as const }),
      ),
    ];
    const memberIds = [...spec.admins, ...spec.members].map((k) => (users.get(k) as User).id);
    const zones = await em.save(
      spec.zones.map((key, i) =>
        em.create(SafeZone, {
          id: stableUuid(`zone:${spec.name}:${key}`),
          name: PLACES[key].name,
          color: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'][i % 4],
          radius: PLACES[key].radius,
          centerLatitude: PLACES[key].latitude,
          centerLongitude: PLACES[key].longitude,
          membersToTrack: memberIds,
          familyId: family.id,
        }),
      ),
    );
    families.push({ spec, family, members: await em.save(members), zones });
  }
  return { users, specs, families, settings };
}
