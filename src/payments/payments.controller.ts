import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';
import { AuthenticatedUser } from '../common/auth/authenticated-user.decorator';
import type { User } from '../users';
import { PaymentsGateway, PaymentIntentResult } from './payments.gateway';

const MAX_AMOUNT_MINOR_UNITS = 99_999_999;

export class CreatePaymentIntentDto {
  /** Smallest currency unit (cents). */
  @IsInt() @Min(50) @Max(MAX_AMOUNT_MINOR_UNITS) amount: number;
  @IsString() @Length(3, 3) currency: string;
}

@Controller('payments')
@ApiTags('Payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly payments: PaymentsGateway) {}

  @Post('create-payment-intent')
  createIntent(@AuthenticatedUser() user: User, @Body() dto: CreatePaymentIntentDto): Promise<PaymentIntentResult> {
    return this.payments.createPaymentIntent({
      amount: dto.amount,
      currency: dto.currency.toLowerCase(),
      email: user.email,
    });
  }
}
