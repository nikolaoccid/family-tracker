import { Injectable } from '@nestjs/common';
import { UnauthorizedError } from '../common/errors/domain-error';
import { HashService, User, UsersService } from '../users';
import { GoogleIdentityGateway } from './google-identity.gateway';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly hashes: HashService,
    private readonly google: GoogleIdentityGateway,
  ) {}

  /** Returns the user when the credentials match; one message for unknown email and wrong password. */
  async authenticate({ email, password }: LoginDto): Promise<User> {
    const user = await this.users.getByEmail(email);
    const ok = user && (await this.hashes.isMatch(password, user.passwordHash));
    if (!user || !ok) throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid username or password');
    return user;
  }

  async authenticateWithGoogle(idToken: string): Promise<User> {
    return this.users.findOrCreateFromGoogle(await this.google.verify(idToken));
  }
}
