import { Injectable } from '@nestjs/common';
import type { AppError } from '@curebase/shared';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

/** Unique index name → the AppError a violation of it means, e.g. { Participant_email_key: appError.emailTaken }. */
export type UniqueIndexErrors = Record<string, () => AppError>;

/** The unique index a Prisma P2002 error names, if it is one. */
function violatedUniqueIndex(error: unknown): string | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return undefined;
  // With the pg driver adapter the index sits in meta.driverAdapterError.cause.constraint, not the classic meta.target.
  const meta = error.meta as { driverAdapterError?: { cause?: { constraint?: { index?: unknown } } } } | undefined;
  const index = meta?.driverAdapterError?.cause?.constraint?.index;
  return typeof index === 'string' ? index : undefined;
}

/**
 * The base every DAL extends (ADR 002 › Backend layout). DALs are the only code that touches Prisma.
 * Protected helpers only, no generic CRUD: Prisma's per-model delegates share no type, and every query
 * needs its own where and orderBy anyway. Subclasses expose methods named after what they do.
 */
@Injectable()
export abstract class BaseDal {
  constructor(protected readonly prisma: PrismaService) {}

  /** One page and the total of the same rows, read in one snapshot so a concurrent write can't make them disagree. */
  protected async paginate<T>(
    { limit, offset }: { limit: number; offset: number },
    findPage: (page: { take: number; skip: number }) => Prisma.PrismaPromise<T[]>,
    count: () => Prisma.PrismaPromise<number>,
  ): Promise<Page<T>> {
    const [items, total] = await this.prisma.$transaction([findPage({ take: limit, skip: offset }), count()], {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    return { items, total, limit, offset };
  }

  /** Runs a write; a violated unique index listed in `errors` becomes its AppError, anything else is rethrown. */
  protected async uniqueFields<T>(write: PromiseLike<T>, errors: UniqueIndexErrors): Promise<T> {
    try {
      return await write;
    } catch (error) {
      const index = violatedUniqueIndex(error);
      if (index !== undefined && Object.hasOwn(errors, index)) throw errors[index]();
      throw error;
    }
  }
}
