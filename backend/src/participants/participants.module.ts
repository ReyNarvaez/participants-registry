import { Module } from '@nestjs/common';
import { ParticipantsController } from './participants.controller.js';
import { ParticipantsDal } from './participants.dal.js';
import { ParticipantsService } from './participants.service.js';

@Module({
  controllers: [ParticipantsController],
  providers: [ParticipantsService, ParticipantsDal],
})
export class ParticipantsModule {}
