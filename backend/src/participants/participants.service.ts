import { Injectable } from '@nestjs/common';
import type { CreateParticipant, ListParticipantsQuery } from '@curebase/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { bmi } from './bmi.js';

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(participant: CreateParticipant) {
    return this.prisma.participant.create({ data: { ...participant, bmi: bmi(participant) } });
  }

  /** Newest first; id breaks createdAt ties so pages never overlap or skip. */
  async list({ limit, offset, minBmi, maxBmi }: ListParticipantsQuery) {
    const where = { bmi: { gte: minBmi, lte: maxBmi } }; // inclusive; Prisma drops an undefined bound
    // Repeatable read: items and total come from one snapshot, so a concurrent create can't make them disagree.
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.participant.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit, skip: offset }),
        this.prisma.participant.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { items, total, limit, offset };
  }
}
