import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AssessmentServiceError } from "@/services/errors";

export function jsonError(
  message: string,
  status: number,
  details?: unknown,
) {
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

export function jsonFromError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Validation failed.", 400, error.flatten());
  }

  if (error instanceof AssessmentServiceError) {
    return jsonError(error.message, error.status, error.details);
  }

  if (error instanceof Error && error.name === "MongoServerSelectionError") {
    return jsonError(
      "Database connection failed. Verify that MongoDB is running and MONGODB_URI is correct.",
      503,
    );
  }

  if (error instanceof Error && error.message.startsWith("Missing MONGODB_")) {
    return jsonError(error.message, 500);
  }

  return jsonError("An unexpected error occurred.", 500);
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AssessmentServiceError(400, "Request body must be valid JSON.");
  }
}
