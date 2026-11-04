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
  async list({ limit, offset }: ListParticipantsQuery) {
    // Repeatable read: items and total come from one snapshot, so a concurrent create can't make them disagree.
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.participant.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit, skip: offset }),
        this.prisma.participant.count(),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { items, total, limit, offset };
  }
}
