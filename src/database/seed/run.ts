import { In } from 'typeorm';
import dataSource from '../data-source';
import { LocationHistory } from '../../locations/entities/location-history.entity';
import { Family } from '../../families/entities/family.entity';
import { User } from '../../users/entities/user.entity';
import { ZoneAnalytics } from '../../zone-analytics/entities/zone-analytics.entity';
import { DEMO_PASSWORD, FAMILIES, USERS } from './fixtures';
import { stableUuid } from './prng';
import { createPeople } from './people';
import { createTracking } from './tracking';
import { Alert } from '../../alerts/entities/alert.entity';

/**
 * Fills the database with fictional demo data: ten people in three families around public
 * landmarks of Zagreb, with 14 days of movement, zone visits, alerts and every subscription state.
 * Idempotent: does nothing when the demo users exist. `--reset` replaces them. Never runs in production.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV=production');
  }
  const reset = process.argv.includes('--reset');
  await dataSource.initialize();
  try {
    const emails = USERS.map((u) => u.email);
    const existing = await dataSource.getRepository(User).find({ where: { email: In(emails) } });

    if (existing.length > 0 && !reset) {
      process.stdout.write('Demo data already present (use --reset to recreate).\n');
      return;
    }
    await dataSource.transaction(async (em) => {
      if (existing.length > 0) {
        const ids = existing.map((u) => u.id);
        await em.query(
          'DELETE FROM zone_visit WHERE analytics_id IN (SELECT id FROM zone_analytics WHERE user_id = ANY($1))',
          [ids],
        );
        await em.delete(ZoneAnalytics, { userId: In(ids) });
        // Both tables carry a user_id column the FK does not cover, so cascades miss them.
        await em.delete(Alert, { userId: In(ids) });
        await em.delete(LocationHistory, { userId: In(ids) });
        await em.delete(Family, { id: In(FAMILIES.map((f) => stableUuid(`family:${f.name}`))) });
        await em.delete(User, { id: In(ids) });
      }
      const now = new Date();
      await createTracking(em, await createPeople(em, now), now);
    });
    process.stdout.write(`Seeded ${USERS.length} demo users. Password for every demo account: ${DEMO_PASSWORD}\n`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
