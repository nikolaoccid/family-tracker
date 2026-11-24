import { PLACES, PlaceKey, Routine } from './fixtures';
import type { Stop } from './movement';

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

function stop(key: PlaceKey, arrive: number, leave: number): Stop {
  return { place: PLACES[key], arrive, leave };
}

/** First of the preferred places the family actually tracks; falls back to home. */
function firstAvailable(available: readonly PlaceKey[], ...preferred: PlaceKey[]): PlaceKey {
  return preferred.find((key) => available.includes(key)) ?? 'home';
}

/** Where a person with this routine is on a given day (UTC weekday 0 = Sunday). */
export function planFor(routine: Routine, weekday: number, dayIndex: number, available: readonly PlaceKey[]): Stop[] {
  const weekend = weekday === 0 || weekday === 6;
  switch (routine) {
    case 'office-worker': {
      if (weekend)
        return [
          stop('home', at(8), at(11)),
          stop(firstAvailable(available, 'park'), at(12), at(14)),
          stop('home', at(15), at(21)),
        ];
      const work = firstAvailable(available, 'office', 'school');
      const plan = [stop('home', at(6), at(7, 30)), stop(work, at(8, 30), at(16, 30))];
      if (available.includes('gym') && (weekday === 2 || weekday === 4)) plan.push(stop('gym', at(17, 30), at(18, 30)));
      return [...plan, stop('home', at(19, 30), at(22))];
    }
    case 'school-kid':
      if (weekend) return [stop('home', at(9), at(21))];
      return [
        stop('home', at(6, 30), at(7, 20)),
        stop(firstAvailable(available, 'school'), at(7, 50), at(14)),
        stop('home', at(14, 40), at(21)),
      ];
    case 'shift-worker': {
      const work = firstAvailable(available, 'office', 'park');
      return dayIndex % 2 === 0
        ? [stop(work, at(6), at(14)), stop('home', at(14, 45), at(22))]
        : [stop('home', at(7), at(13)), stop(work, at(14), at(22))];
    }
    case 'homebody':
      return dayIndex % 3 === 0 && available.includes('park')
        ? [stop('home', at(8), at(10, 30)), stop('park', at(11), at(12, 30)), stop('home', at(13), at(21))]
        : [stop('home', at(8), at(21))];
    default:
      return [];
  }
}
