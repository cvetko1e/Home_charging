export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE_UNAVAILABLE"
  | "DATABASE_CONFIGURATION_ERROR"
  | "INVALID_REQUEST";

// Only safe, application-owned messages/details belong here, never raw errors.
export type ServiceError = {
  code: ErrorCode;
  message: string;
  details?: unknown;
};

export type Result<T, E = ServiceError> =
  | { success: true; data: T }
  | { success: false; error: E };
