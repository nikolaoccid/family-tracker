import type { User } from '../../users';

export class LoginResponseDto {
  user: User;
  token: string;
}
