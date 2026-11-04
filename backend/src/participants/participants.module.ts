import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { ParticipantsController } from './participants.controller.js';
import { ParticipantsService } from './participants.service.js';

@Module({
  controllers: [ParticipantsController],
  providers: [ParticipantsService, PrismaService],
})
export class ParticipantsModule {}
