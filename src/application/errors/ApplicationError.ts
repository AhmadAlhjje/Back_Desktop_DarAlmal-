export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
