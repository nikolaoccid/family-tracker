import type { MemberRole } from '../entities/family-member.entity';

export function canManageMembers(role: MemberRole | undefined): boolean {
  return role === 'admin';
}

/** Admins manage anyone; any member may remove themself (leave the family). */
export function canRemoveMember(actorRole: MemberRole | undefined, actorId: string, targetId: string): boolean {
  return canManageMembers(actorRole) || actorId === targetId;
}
