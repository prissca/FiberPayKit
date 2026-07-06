/** Typed API errors that serialize into a consistent JSON error envelope. */

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toBody(): ErrorBody {
    return {
      error: { code: this.code, message: this.message, details: this.details },
    };
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, "unauthorized", message);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(403, "forbidden", message);
  }
  static notFound(message = "Not found") {
    return new ApiError(404, "not_found", message);
  }
  static badRequest(message = "Bad request", details?: unknown) {
    return new ApiError(400, "bad_request", message, details);
  }
  static conflict(message = "Conflict") {
    return new ApiError(409, "conflict", message);
  }
  static internal(message = "Internal server error") {
    return new ApiError(500, "internal_error", message);
  }
}
