import { createAdminIndexes } from "@/repositories/admins";
import { createAssessmentIndexes } from "@/repositories/assessments";
import { createCatalogIndexes } from "@/repositories/catalogs";

export async function ensureDatabaseIndexes(): Promise<void> {
  await Promise.all([createAssessmentIndexes(), createAdminIndexes(), createCatalogIndexes()]);
}
