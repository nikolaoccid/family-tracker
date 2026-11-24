import { Allow, IsDateString, IsLatitude, IsLongitude, IsNumber, IsOptional, IsUUID } from 'class-validator';

/** Body of the emergency / heading-home endpoints. The server decides type, message, owner and time. */
export class RaiseAlertDto {
  @IsUUID() familyId: string;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;
  @IsOptional() @IsDateString() locationTimestamp?: string;
  @IsOptional() @IsNumber() accuracy?: number;
  @IsOptional() @IsNumber() speed?: number;
  @IsOptional() @IsNumber() heading?: number;

  // The app also sends these; they are accepted and ignored (set by the server).
  @Allow() type?: unknown;
  @Allow() message?: unknown;
  @Allow() userId?: unknown;
  @Allow() timestamp?: unknown;
}
