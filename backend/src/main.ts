import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

process.loadEnvFile(); // ponytail: requires backend/.env; guard it once a deploy sets env vars directly

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
