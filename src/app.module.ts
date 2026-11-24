import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CookieSessionModule } from 'nestjs-cookie-session';
import { AlertsModule } from './alerts';
import { AuthModule } from './auth';
import { ChatModule } from './chat';
import { AppConfig } from './common/config/app-config';
import { AppConfigModule } from './common/config/config.module';
import { databaseModule } from './common/database/database.module';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { HttpModule } from './common/http/http.module';
import { loggingModule } from './common/logging/logging.module';
import { SecurityModule } from './common/security/security.module';
import { FamiliesModule } from './families';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations';
import { NotificationsModule } from './notifications';
import { PaymentsModule } from './payments/payments.module';
import { PrivacySettingsModule } from './privacy-settings';
import { SafeZonesModule } from './safe-zones';
import { SharingSchedulesModule } from './sharing-schedules';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users';
import { ZoneAnalyticsModule } from './zone-analytics';

@Module({
  imports: [
    AppConfigModule,
    loggingModule,
    databaseModule,
    SecurityModule,
    HttpModule,
    IdempotencyModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    CookieSessionModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({ session: { secret: config.sessionSecret } }),
    }),
    AuthModule,
    UsersModule,
    FamiliesModule,
    LocationsModule,
    SafeZonesModule,
    ZoneAnalyticsModule,
    SharingSchedulesModule,
    PrivacySettingsModule,
    AlertsModule,
    NotificationsModule,
    ChatModule,
    PaymentsModule,
    SubscriptionsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
