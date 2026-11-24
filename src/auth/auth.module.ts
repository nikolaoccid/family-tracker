import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { GoogleIdentityGateway } from './google-identity.gateway';
import { AuthService } from './auth.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleIdentityGateway, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
