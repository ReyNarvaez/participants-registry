import {
  BadRequestException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  type ArgumentsHost,
} from '@nestjs/common';
import { appError, createParticipantSchema } from '@curebase/shared';
import { ErrorFilter } from './error.filter.js';
import { bmi } from '../participants/bmi.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

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

describe('ErrorFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('maps invalid client input (the pipe) to 400 VALIDATION_ERROR with a detail per field', () => {
    const pipe = new ZodValidationPipe(createParticipantSchema);
    const { status, body } = respond(thrown(() => pipe.transform({ email: 'nope', weightUnit: 'kg' })));
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toContainEqual({ field: 'email', message: 'Enter a valid email' });
    expect(body.error.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(['name', 'phone', 'dateOfBirth', 'weight', 'height', 'heightUnit']),
    );
  });

  it('maps the BMI guard to 400 BMI_UNUSABLE, whose catalog entry names the fields', () => {
    expect(respond(thrown(() => bmi({ weight: 1e-6, weightUnit: 'kg', height: 175, heightUnit: 'cm' })))).toEqual({
      status: 400,
      body: { error: { code: 'BMI_UNUSABLE', message: 'Weight and height do not give a usable BMI' } },
    });
  });

  it.each([
    ['an unexpected error', new Error('connect ECONNREFUSED postgres://secret@db')],
    [
      'a raw ZodError (an internal parse bug, not client input)',
      thrown(() => createParticipantSchema.parse({})) as Error,
    ],
    ['a client-only AppError thrown on the server', appError.unavailable()],
  ])('maps %s to 500 INTERNAL_ERROR without leaking it, and logs it', (_, exception) => {
    expect(respond(exception)).toEqual({
      status: 500,
      body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
    });
    expect(Logger.prototype.error).toHaveBeenCalledWith(exception.stack);
  });

  it("maps Nest's own client errors to catalog codes without echoing their message", () => {
    // The real malformed-JSON message quotes the body, so it could carry personal data.
    const malformed = new BadRequestException('Unexpected token d, "{"email":"jane@x.com","d"... is not valid JSON');
    const readable = { error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid' } };
    expect(respond(malformed)).toEqual({ status: 400, body: readable });
    expect(respond(new PayloadTooLargeException('request entity too large'))).toEqual({ status: 400, body: readable });
    expect(respond(new NotFoundException('Cannot GET /nope'))).toEqual({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'Not found' } },
    });
  });
});
