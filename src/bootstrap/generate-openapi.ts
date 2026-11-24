import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { buildOpenApiDocument } from './swagger';

/**
 * Writes docs/openapi.json from the controllers and DTOs. Runs in Nest "preview" mode:
 * the module graph is built without instantiating providers, so no database or secrets are needed.
 * Run through `npm run openapi` (needs the compiled output for the Swagger plugin's DTO metadata).
 */
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { preview: true, logger: false });
  const target = resolve(process.argv[2] ?? 'docs/openapi.json');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(buildOpenApiDocument(app), null, 2)}\n`);
  await app.close();
  process.stdout.write(`Wrote ${target}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
