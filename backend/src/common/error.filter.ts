import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AppError, appError } from '@curebase/shared';
import type { Response } from 'express';

/**
 * Turns every thrown error into the shared ErrorResponse. Status and message always come from the catalog.
 * Knows no entity: features turn their own failures (e.g. a taken email, in their DAL) into AppErrors.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const error = this.toAppError(exception);
    host.switchToHttp().getResponse<Response>().status(error.status ?? 500).json(error.toResponse());
  }

  private toAppError(exception: unknown): AppError {
    // A client-only code (no status) thrown on the server is a bug, handled like any other unexpected error.
    if (exception instanceof AppError && exception.status !== undefined) return exception;
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
