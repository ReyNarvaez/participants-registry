import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { errorStatus, type ErrorResponse } from '@curebase/shared';
import type { Response } from 'express';
import { Prisma } from './generated/prisma/client.js';
import { ValidationError } from './validation.error.js';

// With the pg driver adapter, P2002 carries the violated index in meta.driverAdapterError.cause.constraint,
// not in the classic meta.target.
const taken = {
  Participant_email_key: { code: 'EMAIL_TAKEN', message: 'A participant with this email already exists' },
  Participant_phone_key: { code: 'PHONE_TAKEN', message: 'A participant with this phone number already exists' },
} as const;

/** Turns every thrown error into the shared ErrorResponse. */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const [status, body] = this.toResponse(exception);
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private toResponse(exception: unknown): [number, ErrorResponse] {
    if (exception instanceof ValidationError) {
      const { message, details } = exception;
      return [errorStatus.VALIDATION_ERROR, { error: { code: 'VALIDATION_ERROR', message, details } }];
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      const meta = exception.meta as { driverAdapterError?: { cause?: { constraint?: { index?: string } } } } | undefined;
      const error = taken[meta?.driverAdapterError?.cause?.constraint?.index as keyof typeof taken];
      if (error) return [errorStatus[error.code], { error }];
    }
    // Nest's own errors: malformed JSON (400), unknown route (404). Keep their status.
    // ponytail: any other 4xx (e.g. 413) reuses VALIDATION_ERROR; add a code when a client must tell them apart.
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const status = exception.getStatus();
      const code = status === errorStatus.NOT_FOUND ? 'NOT_FOUND' : 'VALIDATION_ERROR';
      return [status, { error: { code, message: exception.message } }];
    }
    this.logger.error(exception instanceof Error ? exception.stack : exception);
    return [errorStatus.INTERNAL_ERROR, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }];
  }
}
