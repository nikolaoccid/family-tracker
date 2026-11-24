import type { FamilyMember } from '../entities/family-member.entity';

/** The parts of a stored location history row the member view needs. */
export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: Date;
  whoCanSeeLocation?: string[];
}

export interface LocationView {
  latitude: number;
  longitude: number;
  accuracy: number | undefined;
  speed: number | undefined;
  heading: number | undefined;
  timestamp: string | undefined;
}

export interface MemberView {
  id: string | null;
  name: string;
  email: string;
  avatar: string | null;
  phone: string | null;
  isPremium: boolean;
  createdAt: string | null;
  hasNotificationsEnabled: boolean;
  hasLocationEnabled: boolean;
  role: FamilyMember['role'];
  location: LocationView | undefined;
  batteryLevel: number | null | undefined;
  lastSeen: string | null;
  isSharing: boolean;
  isInvited: boolean;
}

function toLocationView(location: LocationSnapshot | null): LocationView | undefined {
  if (location?.latitude == null || location.longitude == null) return undefined;
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    speed: location.speed,
    heading: location.heading,
    timestamp: location.timestamp?.toISOString(),
  };
}

/** What a viewer may see of one member: pending invites show the invited address in place of a profile. */
export function toMemberView(member: FamilyMember, visibleLocation: LocationSnapshot | null): MemberView {
  const user = member.user;
  return {
    id: user?.id ?? member.invitedEmail,
    name: user?.name ?? `Invited - ${member.invitedEmail}`,
    email: user?.email ?? member.invitedEmail ?? 'unknown@example.com',
    avatar: user?.avatar ?? null,
    phone: user?.phone ?? null,
    isPremium: user?.isPremium ?? false,
    createdAt: user?.createdAt?.toISOString() ?? null,
    hasNotificationsEnabled: user?.hasNotificationsEnabled ?? false,
    hasLocationEnabled: user?.hasLocationEnabled ?? false,
    role: member.role,
    location: toLocationView(visibleLocation),
    batteryLevel: member.batteryLevel,
    lastSeen: member.lastSeen?.toISOString() ?? null,
    isSharing: member.isSharing,
    isInvited: !!member.invitedEmail,
  };
}

/** A member's last location is visible to a viewer only if the member allowed it when reporting. */
export function visibleLocationFor(member: FamilyMember, viewerId: string | undefined): LocationSnapshot | null {
  const location = member.latestLocation ?? null;
  return location && viewerId && location.whoCanSeeLocation?.includes(viewerId) ? location : null;
}
