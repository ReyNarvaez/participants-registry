import { Body, Controller, Post } from '@nestjs/common';
import { createParticipantSchema, type CreateParticipant } from '@curebase/shared';
import { ZodValidationPipe } from '../zod-validation.pipe.js';
import { ParticipantsService } from './participants.service.js';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createParticipantSchema)) participant: CreateParticipant) {
    return this.participants.create(participant);
  }
}
