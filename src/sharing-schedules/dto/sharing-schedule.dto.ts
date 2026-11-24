import {
  Allow,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { DAYS_OF_WEEK, DayOfWeek, TIME_PATTERN } from '../domain/schedule-window';

export class SharingScheduleInputDto {
  /** Accepted for clients that echo the stored schedule; the server assigns ids. */
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(DAYS_OF_WEEK, { each: true })
  days: DayOfWeek[];

  @IsString()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:MM format' })
  startTime: string;

  @IsString()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:MM format' })
  endTime: string;

  @IsBoolean()
  enabled: boolean;

  // Stored fields echoed back by the app; ignored.
  @Allow() createdAt?: unknown;
  @Allow() updatedAt?: unknown;
}

export class UpdateSharingScheduleDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @IsArray() @ArrayNotEmpty() @IsIn(DAYS_OF_WEEK, { each: true }) days?: DayOfWeek[];
  @IsOptional() @IsString() @Matches(TIME_PATTERN, { message: 'startTime must be in HH:MM format' }) startTime?: string;
  @IsOptional() @IsString() @Matches(TIME_PATTERN, { message: 'endTime must be in HH:MM format' }) endTime?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}
