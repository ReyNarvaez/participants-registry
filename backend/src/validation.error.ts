/** Client input that failed validation. The only error ErrorFilter turns into a 400. */
export class ValidationError extends Error {
  constructor(readonly details: { field: string; message: string }[]) {
    super('Some fields are invalid');
  }
}
