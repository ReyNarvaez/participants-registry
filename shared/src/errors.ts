// One error contract for every endpoint (ADR 002 › Errors). Responses carry the code; the status, the message
// and the fields a code always concerns come from this catalog, on both the backend and the frontend.

export type ErrorDetail = { field: string; message: string };

type CatalogEntry = { code: string; status?: number; message: string; fields?: readonly string[] };

export const errorCatalog = {
  /** Client input failed a schema (details name the fields), or the request was unreadable (no details). */
  validation: { code: 'VALIDATION_ERROR', status: 400, message: 'Some fields are invalid' },
  bmiUnusable: {
    code: 'BMI_UNUSABLE',
    status: 400,
    message: 'Weight and height do not give a usable BMI',
    fields: ['weight', 'height'],
  },
  notFound: { code: 'NOT_FOUND', status: 404, message: 'Not found' },
  emailTaken: { code: 'EMAIL_TAKEN', status: 409, message: 'A participant with this email already exists', fields: ['email'] },
  phoneTaken: {
    code: 'PHONE_TAKEN',
    status: 409,
    message: 'A participant with this phone number already exists',
    fields: ['phone'],
  },
  internal: { code: 'INTERNAL_ERROR', status: 500, message: 'Something went wrong' },
  /** Client only: no response, or one that is not an ErrorResponse (e.g. a proxy's HTML error page). */
  unavailable: { code: 'UNAVAILABLE', message: 'No response from the server' },
} as const satisfies Record<string, CatalogEntry>;

type Catalog = typeof errorCatalog;
export type ErrorCode = Catalog[keyof Catalog]['code'];

export type ErrorResponse = { error: { code: ErrorCode; message: string; details?: ErrorDetail[] } };

const byCode = new Map<string, CatalogEntry>(Object.values(errorCatalog).map((entry) => [entry.code, entry]));

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, details?: ErrorDetail[]) {
    super(byCode.get(code)!.message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  /** The HTTP status the server answers with; undefined for client-only codes. */
  get status(): number | undefined {
    return byCode.get(this.code)!.status;
  }

  /** One message per field this error concerns: its details, else the catalog's fixed fields. */
  fieldErrors(): ErrorDetail[] {
    const { fields = [] } = byCode.get(this.code)!;
    return this.details ?? fields.map((field) => ({ field, message: this.message }));
  }

  toResponse(): ErrorResponse {
    return { error: { code: this.code, message: this.message, ...(this.details && { details: this.details }) } };
  }

  /** Rebuilds the error a server sent; any body that isn't the shared shape with a known code is UNAVAILABLE. */
  static fromResponse(body: unknown): AppError {
    const error = (body as { error?: { code?: unknown; details?: unknown } } | null)?.error;
    if (typeof error?.code !== 'string' || !byCode.has(error.code)) return appError.unavailable();
    return new AppError(error.code as ErrorCode, Array.isArray(error.details) ? error.details : undefined);
  }
}

/** `throw appError.emailTaken()`: one method per catalog entry, each returning a fresh error with its own stack. */
export const appError = Object.fromEntries(
  Object.entries(errorCatalog).map(([name, { code }]) => [name, (details?: ErrorDetail[]) => new AppError(code, details)]),
) as { [Name in keyof Catalog]: (details?: ErrorDetail[]) => AppError };
