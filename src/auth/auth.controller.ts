import { Body, ClassSerializerInterceptor, Controller, Post, Session, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/auth/public.decorator';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import type { User } from '../users';
import { AccessTokenService, IssuedToken } from '../common/security/access-token.service';
import { AuthService } from './auth.service';
import { GoogleLoginDto, LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login.response.dto';

interface SessionData {
  userId?: string;
}

const LOGIN_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
@ApiTags('Auth')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: AccessTokenService,
  ) {}

  @Public()
  @Throttle(LOGIN_LIMIT)
  @Post('/login')
  async login(@Body() dto: LoginDto, @Session() session: SessionData) {
    const user = await this.auth.authenticate(dto);
    session.userId = user.id;
    return { userId: user.id };
  }

  @Public()
  @Post('/logout')
  logout(@Session() session: SessionData) {
    session.userId = undefined;
    return {};
  }

  /**
   * Trades a valid bearer token for a fresh 30-day one. Works for tokens issued before expiry
   * existed. An expired token cannot be refreshed: the user logs in again.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('/refresh')
  refresh(@AuthenticatedUser() user: User): IssuedToken {
    return this.tokens.issue(user.id);
  }

  /** Google sign-in: verifies the ID token server-side; first use creates an account without a password. */
  @Public()
  @Throttle(LOGIN_LIMIT)
  @Post('/google')
  async google(@Body() dto: GoogleLoginDto): Promise<LoginResponseDto> {
    const user = await this.auth.authenticateWithGoogle(dto.idToken);
    return { user, token: this.tokens.sign(user.id) };
  }

  @Public()
  @Throttle(LOGIN_LIMIT)
  @Post('/login/jwt')
  async loginJwt(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.auth.authenticate(dto);
    return { user, token: this.tokens.sign(user.id) };
  }
}
