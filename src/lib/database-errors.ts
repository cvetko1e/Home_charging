import { MongoServerSelectionError } from "mongodb";
import type { ServiceError } from "@/types/result";

type MongoEnvironmentVariable = "MONGODB_URI" | "MONGODB_DB_NAME";

export class DatabaseConfigurationError extends Error {
  constructor(public readonly variable: MongoEnvironmentVariable) {
    super(`Missing ${variable} environment variable.`);
    this.name = "DatabaseConfigurationError";
  }
}

// Infrastructure failures may throw. Classify them once at the boundary using
// driver types; never copy driver messages (which may include secrets) to clients.
export function classifyDatabaseError(error: unknown): ServiceError | undefined {
  if (error instanceof DatabaseConfigurationError) {
    return {
      code: "DATABASE_CONFIGURATION_ERROR",
      message: `Missing ${error.variable} environment variable.`,
    };
  }

  // Preserve the existing 503 contract for server selection failures. Other
  // driver failures retain the generic unexpected-error response.
  if (error instanceof MongoServerSelectionError) {
    return {
      code: "DATABASE_UNAVAILABLE",
      message:
        "Database connection failed. Verify that MongoDB is running and MONGODB_URI is correct.",
    };
  }

  return undefined;
}
