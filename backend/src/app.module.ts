import { Module } from '@nestjs/common';
import { ParticipantsModule } from './participants/participants.module.js';

@Module({
  imports: [ParticipantsModule],
})
export class AppModule {}
