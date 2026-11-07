export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;
  readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = statusCode < 500;
    Error.captureStackTrace(this, this.constructor);
  }
}
