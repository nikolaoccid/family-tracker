import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AccessTokenService } from '../common/security/access-token.service';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import { Public } from '../common/auth/public.decorator';
import { ForbiddenError, UnauthorizedError } from '../common/errors/domain-error';
import { pageRequest, sendPage } from '../common/pagination/pagination';
import { PageQueryDto } from '../common/pagination/page-query.dto';
import {
  CompleteResetDto,
  CreateUserDto,
  ResetPasswordDto,
  SetStripeSubscriptionDto,
  UpdateUserDto,
} from './dto/user.dto';
import { User, UserRole } from './entities/user.entity';
import { HashService } from './hash.service';
import { UsersService } from './users.service';

const AUTH_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: AccessTokenService,
    private readonly hashService: HashService,
  ) {}

  @Get()
  async getAll(
    @AuthenticatedUser() user: User,
    @Query() query: PageQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (user.userRole !== UserRole.Admin) throw new ForbiddenError('ADMIN_ONLY', 'Admin role required');
    return sendPage(res, await this.users.findAll(pageRequest(query)));
  }

  /** Deletes the caller's account and personal data. */
  @Delete('me')
  async deleteMe(@AuthenticatedUser() user: User): Promise<void> {
    await this.users.deleteAccount(user.id);
  }

  @Get('me')
  me(@AuthenticatedUser() user: User) {
    return user;
  }

  /** Registers a user; for an existing email with the right password it behaves like a login. */
  @Public()
  @Throttle(AUTH_LIMIT)
  @Post()
  async create(@Body() dto: CreateUserDto) {
    const existing = await this.users.getByEmail(dto.email);
    if (existing && !(await this.hashService.isMatch(dto.password, existing.passwordHash))) {
      throw new UnauthorizedError('PASSWORD_MISMATCH', "Password does not match the existing user's password");
    }
    const user = existing ?? (await this.users.create(dto));
    return { user, token: this.tokens.sign(user.id) };
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.users.requestPasswordReset(dto.email);
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('complete-reset')
  async completePasswordReset(@Body() dto: CompleteResetDto) {
    return await this.users.completePasswordReset(dto.token, dto.newPassword);
  }

  @Put('/user/stripe-subscription')
  setStripeSubscription(@AuthenticatedUser() user: User, @Body() dto: SetStripeSubscriptionDto) {
    return this.users.setStripeSubscription(user, dto);
  }

  @Put('/profile')
  updateProfile(@AuthenticatedUser() user: User, @Body() dto: UpdateUserDto) {
    return this.users.updateProfile(user.id, dto);
  }
}
