import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken: string;
}
