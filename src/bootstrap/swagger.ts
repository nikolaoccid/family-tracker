import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const options = new DocumentBuilder()
    .setTitle('Family Tracker API')
    .setDescription('Location sharing for families: safe zones, alerts, privacy schedules and chat.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, options);
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('/', app, buildOpenApiDocument(app), { swaggerOptions: { persistAuthorization: true } });
}
