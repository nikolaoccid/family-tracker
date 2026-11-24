import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Idempotent } from '../common/idempotency/idempotent.decorator';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import type { User } from '../users';
import { CreateFamilyDto, FamilyInviteDto, UpdateFamilyDto } from './dto/family.dto';
import { AddFamilyMemberDto, ToggleLocationSharingDto, UpdateFamilyMemberRoleDto } from './dto/family-member.dto';
import { FamiliesService } from './families.service';

@Controller('family')
@ApiTags('Families')
@ApiBearerAuth()
export class FamiliesController {
  constructor(private readonly families: FamiliesService) {}

  @Idempotent()
  @Post()
  create(@AuthenticatedUser() user: User, @Body() dto: CreateFamilyDto) {
    return this.families.createFamily(dto, user.id);
  }

  @Post('verify')
  verifyInvite(@Body() dto: FamilyInviteDto) {
    return this.families.verifyInvite(dto.inviteToken);
  }

  @Post('accept')
  acceptInvite(@AuthenticatedUser() user: User, @Body() dto: FamilyInviteDto) {
    return this.families.acceptInvite(dto.inviteToken, user.id);
  }

  @Post('reject')
  rejectInvite(@Body() dto: FamilyInviteDto) {
    return this.families.rejectInvite(dto.inviteToken);
  }

  @Get(':familyId')
  get(@AuthenticatedUser() user: User, @Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.families.getFamily(familyId, user.id);
  }

  @Put(':familyId')
  update(
    @AuthenticatedUser() user: User,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: UpdateFamilyDto,
  ) {
    return this.families.updateFamily(familyId, user.id, dto);
  }

  @Delete(':familyId')
  remove(@AuthenticatedUser() user: User, @Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.families.deleteFamily(familyId, user.id);
  }

  @Post(':familyId/members')
  invite(
    @AuthenticatedUser() user: User,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: AddFamilyMemberDto,
  ) {
    return this.families.inviteMember(familyId, user.id, dto.email);
  }

  @Delete(':familyId/members/:memberId')
  removeMember(
    @AuthenticatedUser() user: User,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.families.removeMember(familyId, user.id, memberId);
  }

  @Put(':familyId/members/:memberId/role')
  updateRole(
    @AuthenticatedUser() user: User,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateFamilyMemberRoleDto,
  ) {
    return this.families.updateRole(familyId, user.id, memberId, dto.role);
  }

  @Put(':familyId/location-sharing')
  toggleSharing(
    @AuthenticatedUser() user: User,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: ToggleLocationSharingDto,
  ) {
    return this.families.toggleLocationSharing(familyId, user.id, dto.isSharing);
  }
}
