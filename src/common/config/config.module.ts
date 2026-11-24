import { Global, Module } from '@nestjs/common';
import { AppConfig } from './app-config';
import { loadEnvFiles, processEnv } from './load-env';

@Global()
@Module({
  providers: [
    {
      provide: AppConfig,
      useFactory: () => {
        loadEnvFiles();
        return AppConfig.fromEnv(processEnv());
      },
    },
  ],
  exports: [AppConfig],
})
export class AppConfigModule {}
