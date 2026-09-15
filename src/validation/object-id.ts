import { failure, success } from "@/lib/result";
import type { Result } from "@/types/result";
import { assessmentIdSchema } from "@/validation/assessment";

export function validateObjectId(assessmentId: string): Result<void> {
  // Keep the driver's exact string length check, including trailing newlines.
  if (
    !assessmentIdSchema.safeParse(assessmentId).success ||
    assessmentId.length !== 24
  ) {
    return failure("INVALID_REQUEST", "A valid assessment id is required.");
  }
  return success(undefined);
}
