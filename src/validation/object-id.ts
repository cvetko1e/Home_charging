import { AssessmentServiceError } from "@/services/errors";
import { assessmentIdSchema } from "@/validation/assessment";

export function assertValidObjectId(assessmentId: string) {
  // Keep the driver's exact string length check, including trailing newlines.
  if (
    !assessmentIdSchema.safeParse(assessmentId).success ||
    assessmentId.length !== 24
  ) {
    throw new AssessmentServiceError(400, "A valid assessment id is required.");
  }
}
