import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ValidationError } from './validation.error.js';

// Returns the parsed value, so transforms apply and unknown keys (e.g. a client-sent bmi) are stripped.
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError(result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
    }
    return result.data;
  }
}
