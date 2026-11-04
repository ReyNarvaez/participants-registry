import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { ParticipantsModule } from './participants/participants.module.js';

@Module({
  imports: [PrismaModule, ParticipantsModule],
})
export class AppModule {}
