import { isAnyWindowActive, ScheduleWindow } from '../../sharing-schedules';

export type VisibleTo = 'all' | 'selected' | 'none';

export interface VisibilityInput {
  userId: string;
  /** The user's other family members (first family). Empty when the user has no family. */
  peerIds: string[];
  settings: {
    locationSharingEnabled: boolean;
    visibleTo: VisibleTo;
    selectedMembers: string[];
    schedules: ScheduleWindow[];
  } | null;
  now: Date;
}

/**
 * Who may see this user's location right now. An active sharing schedule opens it to the
 * whole family; otherwise the user's own switch and audience choice decide. The user
 * always sees themselves (unless sharing is off entirely and no schedule is active).
 */
export function resolveVisibleTo({ userId, peerIds, settings, now }: VisibilityInput): string[] {
  if (peerIds.length === 0 || !settings) return [];

  const scheduled = isAnyWindowActive(settings.schedules, now);
  if (!scheduled && !settings.locationSharingEnabled) return [];

  const audience = scheduled ? peerIds : audienceFor(settings.visibleTo, peerIds, settings.selectedMembers);
  return audience.includes(userId) ? [...audience] : [...audience, userId];
}

function audienceFor(visibleTo: VisibleTo, peerIds: string[], selected: string[]): string[] {
  switch (visibleTo) {
    case 'all':
      return peerIds;
    case 'selected':
      return selected;
    default:
      return [];
  }
}
