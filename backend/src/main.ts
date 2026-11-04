import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ErrorFilter } from './common/error.filter.js';

if (existsSync('.env')) process.loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ErrorFilter());
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
