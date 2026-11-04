import { Injectable } from '@nestjs/common';
import { appError, type ListParticipantsQuery } from '@curebase/shared';
import { BaseDal } from '../common/dal/base.dal.js';
import type { Prisma } from '../generated/prisma/client.js';

/** The only participants code that touches Prisma. Email and phone are unique in the database, not checked first. */
@Injectable()
export class ParticipantsDal extends BaseDal {
  create(data: Prisma.ParticipantCreateInput) {
    return this.uniqueFields(this.prisma.participant.create({ data }), {
      Participant_email_key: appError.emailTaken,
      Participant_phone_key: appError.phoneTaken,
    });
  }

  /** Newest first; id breaks createdAt ties so pages never overlap or skip. */
  list({ limit, offset, minBmi, maxBmi }: ListParticipantsQuery) {
    const where = { bmi: { gte: minBmi, lte: maxBmi } }; // inclusive; Prisma drops an undefined bound
    return this.paginate(
      { limit, offset },
      (page) => this.prisma.participant.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...page }),
      () => this.prisma.participant.count({ where }),
    );
  }
}
