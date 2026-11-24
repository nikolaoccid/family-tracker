import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppConfig } from '../common/config/app-config';

/** HTTP-level setup shared by the real server and the e2e tests. */
export function configureApp(app: NestExpressApplication & INestApplication, config: AppConfig): void {
  app.set('trust proxy', 1);
  app.use(helmet());
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.useBodyParser('json', { limit: '256kb' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
}
