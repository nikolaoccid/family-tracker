import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsGateway } from './payments.gateway';

@Module({ controllers: [PaymentsController], providers: [PaymentsGateway], exports: [PaymentsGateway] })
export class PaymentsModule {}
