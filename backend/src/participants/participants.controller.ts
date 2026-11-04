import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  createParticipantSchema,
  listParticipantsQuerySchema,
  type CreateParticipant,
  type ListParticipantsQuery,
} from '@curebase/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ParticipantsService } from './participants.service.js';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createParticipantSchema)) participant: CreateParticipant) {
    return this.participants.create(participant);
  }

  @Get()
  list(@Query(new ZodValidationPipe(listParticipantsQuerySchema)) query: ListParticipantsQuery) {
    return this.participants.list(query);
  }
}
