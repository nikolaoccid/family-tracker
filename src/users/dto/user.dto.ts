import { Allow, IsBoolean, IsDateString, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(200)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  hasNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  hasLocationEnabled?: boolean;

  // Read-only fields the app echoes back from its cached user. Accepted so the
  // strict pipe does not reject the request, never written (see UsersService.updateProfile).
  @Allow() id?: unknown;
  @Allow() email?: unknown;
  @Allow() createdAt?: unknown;
  @Allow() updatedAt?: unknown;
  @Allow() isPremium?: unknown;
  @Allow() isVerified?: unknown;
  @Allow() userRole?: unknown;
}

export class SetStripeSubscriptionDto {
  @IsString()
  stripeCustomerId: string;

  @IsString()
  stripeSubscriptionId: string;

  @IsDateString()
  subscriptionValidUntil: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;
}

export class CompleteResetDto {
  @IsString()
  token: string;

  @IsString()
  @MaxLength(200)
  newPassword: string;
}

export class SendConfirmationDto {
  @IsString()
  userId: string;
}
