import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../config/app-config';
import { buildConnectionOptions } from './typeorm-options';

/** Schema changes only come from versioned migrations (npm run migration:run), never from `synchronize`. */
export const databaseModule = TypeOrmModule.forRootAsync({
  inject: [AppConfig],
  useFactory: (config: AppConfig) => ({
    ...buildConnectionOptions(config.database),
    autoLoadEntities: true,
  }),
});
