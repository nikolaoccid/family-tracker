import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class UpdateFamilyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;
}

export class FamilyInviteDto {
  @IsString()
  inviteToken: string;
}
