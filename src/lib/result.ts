import type { ZodError } from "zod";
import type { ErrorCode, ServiceError } from "@/types/result";

export function success<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function failure(
  code: ErrorCode,
  message: string,
  details?: unknown,
): { success: false; error: ServiceError } {
  return { success: false, error: { code, message, details } };
}

export function validationFailure(error: ZodError): { success: false; error: ServiceError } {
  return failure("VALIDATION_ERROR", "Validation failed.", error.flatten());
}
