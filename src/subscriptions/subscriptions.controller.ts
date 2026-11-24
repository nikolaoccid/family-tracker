import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import type { User } from '../users';
import { SubscribeDto } from './subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscription')
@ApiTags('Subscriptions')
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('plans')
  plans() {
    return this.subscriptions.getPlans();
  }

  @Get()
  current(@AuthenticatedUser() user: User) {
    return this.subscriptions.current(user);
  }

  @Post()
  subscribe(@AuthenticatedUser() user: User, @Body() dto: SubscribeDto) {
    return this.subscriptions.subscribe(user.id, dto.planId);
  }

  @Delete()
  cancel(@AuthenticatedUser() user: User) {
    return this.subscriptions.cancel(user.id);
  }
}
