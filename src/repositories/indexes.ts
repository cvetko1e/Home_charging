import { createAdminIndexes } from "@/repositories/admins";
import { createAssessmentIndexes } from "@/repositories/assessments";

export async function ensureDatabaseIndexes() {
  await Promise.all([createAssessmentIndexes(), createAdminIndexes()]);
}
