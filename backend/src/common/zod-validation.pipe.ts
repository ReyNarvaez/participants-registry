import type { PipeTransform } from '@nestjs/common';
import { appError } from '@curebase/shared';
import type { ZodType } from 'zod';

// Returns the parsed value, so transforms apply and unknown keys (e.g. a client-sent bmi) are stripped.
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw appError.validation(result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
    }
    return result.data;
  }
}
