import {
  Allow,
  IsArray,
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
} from 'class-validator';

const MAX_RADIUS_M = 50_000;

export class CreateSafeZoneDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsString() @MaxLength(32) color: string;
  @IsNumber() @IsPositive() @Max(MAX_RADIUS_M) radius: number;
  @IsLatitude() centerLatitude: number;
  @IsLongitude() centerLongitude: number;
  @IsArray() @IsString({ each: true }) membersToTrack: string[];
  @IsBoolean() isActive: boolean;
  @IsUUID() familyId: string;
}

export class UpdateSafeZoneDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(32) color?: string;
  @IsOptional() @IsNumber() @IsPositive() @Max(MAX_RADIUS_M) radius?: number;
  @IsOptional() @IsLatitude() centerLatitude?: number;
  @IsOptional() @IsLongitude() centerLongitude?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) membersToTrack?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;

  // The app sends the whole zone back on update; these are accepted and never written.
  @Allow() id?: unknown;
  @Allow() familyId?: unknown;
  @Allow() createdAt?: unknown;
}

export class ToggleSafeZoneStatusDto {
  @IsBoolean()
  isActive: boolean;
}
