import { getMongoClient, getMongoDb } from "../src/lib/mongodb";
import { shouldAllowDatabaseReset } from "../src/lib/env";
import { ensureDatabaseIndexes } from "../src/repositories/indexes";
import type { AssessmentDocument } from "../src/repositories/assessments";
import { createDevelopmentAdmin } from "../src/services/adminAuth";
import { loadLocalEnv } from "./load-local-env";
import { assessmentCount, upsertSeedAssessments } from "./seed-assessments";

async function main() {
  loadLocalEnv();

  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed data cannot be created in production.");
  }

  const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required.");
  }

  await ensureDatabaseIndexes();

  const db = await getMongoDb();

  if (shouldAllowDatabaseReset()) {
    await Promise.all([
      db.collection("assessments").deleteMany({}),
      db.collection("admin_sessions").deleteMany({}),
    ]);
  }

  const admin = await createDevelopmentAdmin({
    email: adminEmail,
    password: adminPassword,
  });
  const seededCount = await upsertSeedAssessments(
    db.collection<AssessmentDocument>("assessments"),
  );

  console.log(`Seeded admin ${admin.email}.`);
  console.log(
    `Upserted ${seededCount} assessments (${assessmentCount.completed} completed, ${assessmentCount.drafts} drafts).`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const client = await getMongoClient();
      await client.close();
    } catch {
      return;
    }
  });
