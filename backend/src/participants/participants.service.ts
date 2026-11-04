import { Injectable } from '@nestjs/common';
import type { CreateParticipant } from '@curebase/shared';
import { PrismaService } from '../prisma.service.js';
import { bmi } from './bmi.js';

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(participant: CreateParticipant) {
    return this.prisma.participant.create({ data: { ...participant, bmi: bmi(participant) } });
  }
}
