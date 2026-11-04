import { Injectable } from '@nestjs/common';
import { bmi } from './bmi.js';
import type { CreateParticipant, ListParticipantsQuery } from '@curebase/shared';
import { ParticipantsDal } from './participants.dal.js';

/** The participant rules. Never touches Prisma: storage goes through ParticipantsDal. */
@Injectable()
export class ParticipantsService {
  constructor(private readonly participants: ParticipantsDal) {}

  /** BMI is always computed here from the measurements, never taken from the client. */
  create(participant: CreateParticipant) {
    return this.participants.create({ ...participant, bmi: bmi(participant) });
  }

  list(query: ListParticipantsQuery) {
    return this.participants.list(query);
  }
}
