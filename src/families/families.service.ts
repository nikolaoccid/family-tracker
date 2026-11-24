import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenError, NotFoundError } from '../common/errors/domain-error';
import { MAX_PAGE_LIMIT } from '../common/pagination/page-query.dto';
import { MailService, MailTokenService } from '../mailer';
import { UsersService } from '../users';
import { CreateFamilyDto, UpdateFamilyDto } from './dto/family.dto';
import { inviteIsFor } from './domain/invite';
import { toMemberView, visibleLocationFor } from './domain/member-view';
import { canManageMembers, canRemoveMember } from './domain/roles';
import { Family } from './entities/family.entity';
import { FamilyMember, MemberRole } from './entities/family-member.entity';

/** Other members must not receive each other's push tokens or billing identifiers. */
function withoutPrivateFields({ pushTokens: _tokens, user, ...member }: FamilyMember) {
  if (!user) return { ...member, user };
  const {
    passwordHash: _p,
    stripeCustomerId: _c,
    stripeSubscriptionId: _s,
    subscriptionValidUntil: _v,
    ...publicUser
  } = user;
  return { ...member, user: publicUser };
}

/** A family or a user's memberships are small by nature; the bound only guards against runaway data. */
const BOUND = MAX_PAGE_LIMIT;

export interface MemberLocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

@Injectable()
export class FamiliesService {
  constructor(
    @InjectRepository(Family) private readonly families: Repository<Family>,
    @InjectRepository(FamilyMember) private readonly members: Repository<FamilyMember>,
    private readonly mail: MailService,
    private readonly mailTokens: MailTokenService,
    private readonly users: UsersService,
  ) {}

  // ---- family -------------------------------------------------------------

  /** The requested family if the viewer belongs to it, otherwise the family they do belong to. */
  async getFamily(familyId: string, viewerId: string) {
    const membership =
      (await this.members.findOneBy({ familyId, userId: viewerId })) ?? (await this.findMembership(viewerId));
    if (!membership) throw new NotFoundError('FAMILY_NOT_FOUND', 'Family not found');
    return this.describe(membership.familyId, viewerId);
  }

  async createFamily(dto: CreateFamilyDto, userId: string) {
    const family = await this.families.save(this.families.create({ ...dto, ownerId: userId }));
    await this.members.save(this.members.create({ familyId: family.id, userId, role: 'admin', isSharing: true }));
    family.members = await this.members.find({ where: { familyId: family.id }, take: BOUND });
    return family;
  }

  async updateFamily(familyId: string, actorId: string, dto: UpdateFamilyDto) {
    await this.assertCanManage(familyId, actorId);
    if (dto.name !== undefined) await this.families.update(familyId, dto);
    return this.describe(familyId, actorId);
  }

  async deleteFamily(familyId: string, actorId: string) {
    await this.assertCanManage(familyId, actorId);
    await this.members.delete({ familyId });
    return this.families.delete(familyId);
  }

  // ---- members ------------------------------------------------------------

  async inviteMember(familyId: string, actorId: string, email: string) {
    await this.assertCanManage(familyId, actorId);
    const pending = await this.members.findOneBy({ familyId, invitedEmail: email });
    if (!pending) await this.members.save(this.members.create({ familyId, invitedEmail: email, role: 'member' }));
    await this.mail.sendFamilyInvitationEmail(email, familyId);
    return this.describe(familyId, actorId);
  }

  async removeMember(familyId: string, actorId: string, targetId: string) {
    const actor = await this.requireMembership(familyId, actorId);
    if (!canRemoveMember(actor.role, actorId, targetId)) {
      throw new ForbiddenError('NOT_FAMILY_ADMIN', 'Only an admin can remove other members');
    }
    const target = targetId.includes('@') ? { familyId, invitedEmail: targetId } : { familyId, userId: targetId };
    await this.members.delete(target);
    return this.describe(familyId, actorId);
  }

  async updateRole(familyId: string, actorId: string, targetId: string, role: MemberRole) {
    await this.assertCanManage(familyId, actorId);
    await this.members.update({ familyId, userId: targetId }, { role });
    return this.describe(familyId, actorId);
  }

  toggleLocationSharing(familyId: string, userId: string, isSharing: boolean) {
    return this.members.update({ familyId, userId }, { isSharing });
  }

  // ---- invites ------------------------------------------------------------

  async verifyInvite(inviteToken: string) {
    const claims = this.readInvite(inviteToken);
    const family = await this.families.findOneBy({ id: claims.familyId });
    if (!family) throw new NotFoundError('INVITE_INVALID', 'Invalid invite token');
    return {
      familyId: family.id,
      familyName: family.name,
      inviteeMail: claims.userId,
      expiresAt: claims.expiresAt,
    };
  }

  async acceptInvite(inviteToken: string, userId: string) {
    const claims = this.readInvite(inviteToken);
    const user = await this.users.requireById(userId);
    if (!inviteIsFor(claims.userId, user.email)) {
      throw new ForbiddenError('INVITE_FOR_OTHER_USER', 'This invitation was sent to a different email address');
    }
    const invite = await this.members.findOneBy({ familyId: claims.familyId, invitedEmail: claims.userId });
    if (!invite) throw new NotFoundError('INVITE_INVALID', 'Invalid invite token');
    return this.members.update(invite.id, { userId, invitedEmail: null });
  }

  async rejectInvite(inviteToken: string) {
    const claims = this.readInvite(inviteToken);
    const invite = await this.members.findOneBy({ familyId: claims.familyId, invitedEmail: claims.userId });
    if (!invite) throw new NotFoundError('INVITE_INVALID', 'Invalid invite token');
    return this.members.delete(invite.id);
  }

  // ---- queries for other modules -----------------------------------------

  /** The user's (first) family membership, if any. */
  findMembership(userId: string): Promise<FamilyMember | null> {
    return this.members.findOne({ where: { userId } });
  }

  async assertMember(familyId: string, userId: string): Promise<FamilyMember> {
    return this.requireMembership(familyId, userId);
  }

  /** Other members of the user's family, as user ids. */
  async peerUserIds(userId: string): Promise<string[]> {
    const membership = await this.findMembership(userId);
    if (!membership) return [];
    const rows = await this.members.find({ where: { familyId: membership.familyId }, take: BOUND });
    return rows.flatMap((m) => (m.userId && m.userId !== userId ? [m.userId] : []));
  }

  /** Id and display name of every registered member, for the chat provider. */
  async memberProfiles(familyId: string): Promise<Array<{ id: string; name: string }>> {
    const rows = await this.members.find({ where: { familyId }, relations: ['user'], take: BOUND });
    return rows.flatMap((m) => (m.user ? [{ id: m.user.id, name: m.user.name }] : []));
  }

  /** Members of a family whose latest reported location lists the viewer as allowed to see it. */
  async visibleLocations(familyId: string, viewerId: string) {
    await this.requireMembership(familyId, viewerId);
    const rows = await this.members
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.latestLocation', 'latestLocation')
      .where('member.familyId = :familyId', { familyId })
      .andWhere(":viewerId = ANY(string_to_array(latestLocation.whoCanSeeLocation, ','))", { viewerId })
      .getMany();
    return rows.map(withoutPrivateFields);
  }

  async recordLocation(userId: string, point: MemberLocationUpdate, latestLocationId: string): Promise<void> {
    await this.members.update(
      { userId },
      {
        latitude: point.latitude,
        longitude: point.longitude,
        locationTimestamp: point.timestamp,
        accuracy: point.accuracy,
        speed: point.speed,
        heading: point.heading,
        lastSeen: new Date(),
        latestLocationId,
      },
    );
  }

  async setBatteryLevel(userId: string, level: number | null): Promise<void> {
    await this.members.update({ userId }, { batteryLevel: level });
  }

  async setActiveZones(memberId: string, zoneIds: string[]): Promise<void> {
    await this.members.update(memberId, { activeZones: zoneIds });
  }

  /** Expo push tokens of everyone in the family except the sender. */
  async pushTokensForFamily(familyId: string, exceptUserId: string): Promise<string[]> {
    const rows = await this.members.find({ where: { familyId }, take: BOUND });
    return rows.filter((m) => m.userId !== exceptUserId).flatMap((m) => m.pushTokens ?? []);
  }

  async registerPushToken(userId: string, token: string): Promise<void> {
    const rows = await this.members.find({ where: { userId }, take: BOUND });
    const missing = rows.filter((m) => !(m.pushTokens ?? []).includes(token));
    await Promise.all(missing.map((m) => this.members.update(m.id, { pushTokens: [...(m.pushTokens ?? []), token] })));
  }

  // ---- internals ----------------------------------------------------------

  private readInvite(token: string) {
    try {
      return this.mailTokens.verifyFamilyInvite(token);
    } catch {
      throw new NotFoundError('INVITE_INVALID', 'Invalid invite token');
    }
  }

  private async requireMembership(familyId: string, userId: string): Promise<FamilyMember> {
    const membership = await this.members.findOneBy({ familyId, userId });
    if (!membership) throw new ForbiddenError('NOT_A_MEMBER', 'You are not a member of this family');
    return membership;
  }

  private async assertCanManage(familyId: string, userId: string): Promise<void> {
    const membership = await this.requireMembership(familyId, userId);
    if (!canManageMembers(membership.role)) throw new ForbiddenError('NOT_FAMILY_ADMIN', 'Family admin role required');
  }

  /** The family with its members as the viewer is allowed to see them. */
  private async describe(familyId: string, viewerId: string) {
    const family = await this.families.findOneBy({ id: familyId });
    if (!family) throw new NotFoundError('FAMILY_NOT_FOUND', 'Family not found');
    const rows = await this.members.find({ where: { familyId }, relations: ['user'], take: BOUND });
    const members = rows.map((m) => toMemberView(m, visibleLocationFor(m, viewerId)));
    return { ...family, members };
  }
}
