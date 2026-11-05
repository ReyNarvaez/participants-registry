import { appError } from '@curebase/shared';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { BaseDal, type UniqueIndexErrors } from './base.dal.js';

// The real index names and error shape are covered by real inserts (participants.service.spec.ts).
// This covers the branches a real insert can't reach: unlisted and prototype-named indexes.
class TestDal extends BaseDal {
  write = (failure: unknown, errors: UniqueIndexErrors) => this.uniqueFields(Promise.reject(failure), errors);
}
const dal = new TestDal({} as PrismaService);

const uniqueViolation = (index: string) =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '7.10.1',
    meta: { driverAdapterError: { cause: { constraint: { index } } } },
  });

describe('BaseDal.uniqueFields', () => {
  const errors = { Participant_email_key: appError.emailTaken };

  it('turns a listed index into its AppError', async () => {
    await expect(dal.write(uniqueViolation('Participant_email_key'), errors)).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
    });
  });

  it.each(['Participant_other_key', 'toString', 'constructor'])(
    'rethrows a violation of unlisted index %s as is',
    async (index) => {
      const violation = uniqueViolation(index);
      await expect(dal.write(violation, errors)).rejects.toBe(violation);
    },
  );

  it('rethrows any other failure as is', async () => {
    const failure = new Error('connection lost');
    await expect(dal.write(failure, errors)).rejects.toBe(failure);
  });
});
