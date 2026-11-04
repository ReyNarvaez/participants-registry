import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { createParticipantSchema, listParticipantsQuerySchema } from '@curebase/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { CreateParticipantDto, ListParticipantsQueryDto } from './dto/participant.dto.js';
import { ParticipantsService } from './participants.service.js';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createParticipantSchema)) participant: CreateParticipantDto) {
    return this.participants.create(participant);
  }

  @Get()
  list(@Query(new ZodValidationPipe(listParticipantsQuerySchema)) query: ListParticipantsQueryDto) {
    return this.participants.list(query);
  }
}
