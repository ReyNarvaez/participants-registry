import { Controller, Get } from '@nestjs/common';
import { HEALTH_PATH, type Health } from '@curebase/shared';
import { PrismaService } from './prisma.service.js';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(HEALTH_PATH)
  async health(): Promise<Health> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { db: 'up' };
  }
}
