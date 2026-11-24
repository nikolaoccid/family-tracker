import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';
import { setupSwagger } from './bootstrap/swagger';
import { AppConfig, ConfigError } from './common/config/app-config';
import { loadEnvFiles, processEnv } from './common/config/load-env';

async function bootstrap(): Promise<void> {
  // Fail fast with a readable message before Nest starts wiring modules.
  loadEnvFiles();
  AppConfig.fromEnv(processEnv());

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(AppConfig);
  app.useLogger(app.get(Logger));

  configureApp(app, config);
  setupSwagger(app);

  await app.listen(config.port, '0.0.0.0');
}

bootstrap().catch((error: unknown) => {
  // Config errors are operator mistakes: print them plainly instead of a stack trace.
  process.stderr.write(`${error instanceof ConfigError ? error.message : String(error)}\n`);
  process.exit(1);
});
