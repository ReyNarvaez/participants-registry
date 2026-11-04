import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AppError, appError } from '@curebase/shared';
import type { Response } from 'express';
import { Prisma } from './generated/prisma/client.js';

// With the pg driver adapter, P2002 carries the violated index in meta.driverAdapterError.cause.constraint,
// not in the classic meta.target.
const taken: Record<string, () => AppError> = {
  Participant_email_key: appError.emailTaken,
  Participant_phone_key: appError.phoneTaken,
};

/** Turns every thrown error into the shared ErrorResponse. Status and message always come from the catalog. */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const error = this.toAppError(exception);
    host.switchToHttp().getResponse<Response>().status(error.status!).json(error.toResponse());
  }

  private toAppError(exception: unknown): AppError {
    if (exception instanceof AppError) return exception;
    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      const meta = exception.meta as { driverAdapterError?: { cause?: { constraint?: { index?: string } } } } | undefined;
      const toError = taken[meta?.driverAdapterError?.cause?.constraint?.index ?? ''];
      if (toError) return toError();
    }
    // Nest's own client errors: an unknown route, or an unreadable request (malformed JSON, body too large).
    // Their message is never sent: the malformed-JSON one quotes the request body.
    // ponytail: every unreadable request is VALIDATION_ERROR (400); add a code when a client must tell them apart.
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      return exception.getStatus() === HttpStatus.NOT_FOUND ? appError.notFound() : appError.validation();
    }
    this.logger.error(exception instanceof Error ? exception.stack : exception);
    return appError.internal();
  }
}
