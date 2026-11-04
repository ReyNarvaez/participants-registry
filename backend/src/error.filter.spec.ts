import { BadRequestException, Logger, NotFoundException, type ArgumentsHost } from '@nestjs/common';
import { createParticipantSchema } from '@curebase/shared';
import { ErrorFilter } from './error.filter.js';
import { Prisma } from './generated/prisma/client.js';
import { bmi } from './participants/bmi.js';

function respond(exception: unknown) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  new ErrorFilter().catch(exception, host);
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

function thrown(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error('expected a throw');
}

// Shaped like the error observed from a real duplicate insert through @prisma/adapter-pg 7.10.1.
function uniqueViolation(index: string) {
  return new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on the constraint: \`${index}\``, {
    code: 'P2002',
    clientVersion: '7.10.1',
    meta: {
      modelName: 'Participant',
      driverAdapterError: new Error('UniqueConstraintViolation', {
        cause: {
          originalCode: '23505',
          originalMessage: `duplicate key value violates unique constraint "${index}"`,
          kind: 'UniqueConstraintViolation',
          constraint: { index },
          table: 'Participant',
        },
      }),
    },
  });
}

describe('ErrorFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('maps a ZodError to 400 VALIDATION_ERROR with a detail per field', () => {
    const { status, body } = respond(thrown(() => createParticipantSchema.parse({ email: 'nope', weightUnit: 'kg' })));
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toContainEqual({ field: 'email', message: 'Enter a valid email' });
    expect(body.error.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(['name', 'phone', 'dateOfBirth', 'weight', 'height', 'heightUnit']),
    );
  });

  it('maps the BMI guard to 400 VALIDATION_ERROR on weight and height', () => {
    const { status, body } = respond(thrown(() => bmi({ weight: 1e-6, weightUnit: 'kg', height: 175, heightUnit: 'cm' })));
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.map((d: { field: string }) => d.field)).toEqual(['weight', 'height']);
  });

  it('maps a duplicate email to 409 EMAIL_TAKEN', () => {
    expect(respond(uniqueViolation('Participant_email_key'))).toEqual({
      status: 409,
      body: { error: { code: 'EMAIL_TAKEN', message: 'A participant with this email already exists' } },
    });
  });

  it('maps a duplicate phone to 409 PHONE_TAKEN', () => {
    expect(respond(uniqueViolation('Participant_phone_key'))).toEqual({
      status: 409,
      body: { error: { code: 'PHONE_TAKEN', message: 'A participant with this phone number already exists' } },
    });
  });

  it.each([
    ['an unexpected error', new Error('connect ECONNREFUSED postgres://secret@db')],
    ['a unique violation on an unknown constraint', uniqueViolation('Participant_other_key')],
  ])('maps %s to 500 INTERNAL_ERROR without leaking it, and logs it', (_, exception) => {
    expect(respond(exception)).toEqual({
      status: 500,
      body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
    });
    expect(Logger.prototype.error).toHaveBeenCalledWith(exception.stack);
  });

  it("keeps the status of Nest's own errors (malformed JSON 400, unknown route 404)", () => {
    expect(respond(new BadRequestException('Unexpected token } in JSON'))).toEqual({
      status: 400,
      body: { error: { code: 'VALIDATION_ERROR', message: 'Unexpected token } in JSON' } },
    });
    expect(respond(new NotFoundException('Cannot GET /nope'))).toEqual({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'Cannot GET /nope' } },
    });
  });
});
