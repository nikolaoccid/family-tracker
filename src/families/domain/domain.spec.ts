import { inviteIsFor } from './invite';
import { toMemberView, visibleLocationFor } from './member-view';
import { canManageMembers, canRemoveMember } from './roles';
import type { FamilyMember } from '../entities/family-member.entity';

describe('roles', () => {
  it('only admins manage members', () => {
    expect(canManageMembers('admin')).toBe(true);
    expect(canManageMembers('member')).toBe(false);
    expect(canManageMembers(undefined)).toBe(false);
  });

  it('lets members remove only themselves', () => {
    expect(canRemoveMember('member', 'a', 'a')).toBe(true);
    expect(canRemoveMember('member', 'a', 'b')).toBe(false);
    expect(canRemoveMember('admin', 'a', 'b')).toBe(true);
  });
});

describe('inviteIsFor', () => {
  it('ignores case and surrounding spaces', () => {
    expect(inviteIsFor('Ana@Example.com', ' ana@example.com ')).toBe(true);
  });

  it('rejects another address', () => {
    expect(inviteIsFor('ana@example.com', 'bob@example.com')).toBe(false);
  });
});

const member = (overrides: Partial<FamilyMember> = {}): FamilyMember =>
  ({
    id: 'm1',
    role: 'member',
    isSharing: true,
    invitedEmail: null,
    batteryLevel: 50,
    lastSeen: new Date('2026-03-02T10:00:00Z'),
    user: {
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      isPremium: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    },
    latestLocation: {
      latitude: 45.8,
      longitude: 15.9,
      timestamp: new Date('2026-03-02T10:00:00Z'),
      whoCanSeeLocation: ['viewer'],
    },
    ...overrides,
  }) as unknown as FamilyMember;

describe('visibleLocationFor', () => {
  it('shows the location only to viewers the owner listed', () => {
    expect(visibleLocationFor(member(), 'viewer')).not.toBeNull();
    expect(visibleLocationFor(member(), 'stranger')).toBeNull();
    expect(visibleLocationFor(member(), undefined)).toBeNull();
  });

  it('is null when the member never reported', () => {
    expect(visibleLocationFor(member({ latestLocation: undefined }), 'viewer')).toBeNull();
  });
});

describe('toMemberView', () => {
  it('exposes the profile, location and flags of a registered member', () => {
    const view = toMemberView(member(), member().latestLocation ?? null);
    expect(view).toMatchObject({ id: 'u1', name: 'Ana', isInvited: false, role: 'member', isPremium: true });
    expect(view.location).toEqual({
      latitude: 45.8,
      longitude: 15.9,
      accuracy: undefined,
      speed: undefined,
      heading: undefined,
      timestamp: '2026-03-02T10:00:00.000Z',
    });
  });

  it('describes a pending invite by its email address', () => {
    const view = toMemberView(member({ user: null, invitedEmail: 'new@example.com' }), null);
    expect(view).toMatchObject({
      id: 'new@example.com',
      name: 'Invited - new@example.com',
      email: 'new@example.com',
      isInvited: true,
    });
    expect(view.location).toBeUndefined();
  });
});
