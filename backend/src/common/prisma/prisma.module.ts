import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/** One Prisma client, so one connection pool, shared by every feature module's DAL. */
@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
