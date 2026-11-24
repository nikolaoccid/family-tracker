import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsString, ValidateNested } from 'class-validator';
import { SharingScheduleInputDto } from '../../sharing-schedules';

export class UpdatePrivacySettingsDto {
  @IsBoolean()
  locationSharingEnabled: boolean;

  @IsEnum(['all', 'selected', 'none'])
  visibleTo: 'all' | 'selected' | 'none';

  @IsArray()
  @IsString({ each: true })
  selectedMembers: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SharingScheduleInputDto)
  schedules: SharingScheduleInputDto[];

  @IsBoolean()
  notificationsEnabled: boolean;

  @IsBoolean()
  notifyLowBattery: boolean;

  @IsBoolean()
  notifyZoneEntry: boolean;

  @IsBoolean()
  notifyZoneExit: boolean;
}
