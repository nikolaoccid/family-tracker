import { IsEmail, IsEnum, IsBoolean } from 'class-validator';

export class AddFamilyMemberDto {
  @IsEmail()
  email: string;
}

export class UpdateFamilyMemberRoleDto {
  @IsEnum(['admin', 'member'])
  role: 'admin' | 'member';
}

export class ToggleLocationSharingDto {
  @IsBoolean()
  isSharing: boolean;
}
