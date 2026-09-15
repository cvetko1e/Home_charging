import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { classifyDatabaseError } from "@/lib/database-errors";
import { failure, success, validationFailure } from "@/lib/result";
import type { ErrorCode, Result, ServiceError } from "@/types/result";

const errorStatuses = {
  VALIDATION_ERROR: 400,
  AUTH_REQUIRED: 401,
  INVALID_CREDENTIALS: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  DATABASE_UNAVAILABLE: 503,
  DATABASE_CONFIGURATION_ERROR: 500,
  INVALID_REQUEST: 400,
} satisfies Record<ErrorCode, number>;

export function jsonError(
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        details,
      },
    },
    { status },
  );
}

export function jsonFromServiceError(error: ServiceError): NextResponse {
  return jsonError(error.message, errorStatuses[error.code], error.details);
}

export function jsonFromError(error: unknown): NextResponse {
  // Redirects, notFound(), and other Next.js control flow must reach Next.js.
  unstable_rethrow(error);

  if (error instanceof ZodError) {
    return jsonFromServiceError(validationFailure(error).error);
  }

  // Passing the original object preserves its stack and cause for server logs.
  console.error("API request failed:", error);
  const databaseError = classifyDatabaseError(error);
  if (databaseError) {
    return jsonFromServiceError(databaseError);
  }

  return jsonError("An unexpected error occurred.", 500);
}

export async function readJsonBody(request: Request): Promise<Result<unknown>> {
  try {
    return success(await request.json());
  } catch (error) {
    if (error instanceof SyntaxError) {
      return failure("INVALID_REQUEST", "Request body must be valid JSON.");
    }
    throw error;
  }
}
