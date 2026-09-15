import { getMongoClient, getMongoDb } from "../src/lib/mongodb";
import { shouldAllowDatabaseReset } from "../src/lib/env";
import { ensureDatabaseIndexes } from "../src/repositories/indexes";
import type { AssessmentDocument } from "../src/repositories/assessments";
import { createDevelopmentAdmin } from "../src/services/adminAuth";
import { loadLocalEnv } from "./load-local-env";
import { assessmentCount, upsertSeedAssessments } from "./seed-assessments";
import { upsertSeedCatalogs } from "./seed-catalogs";
import type { ChargerDocument, VehicleDocument } from "../src/repositories/catalogs";

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

  if (shouldAllowDatabaseReset()) {
    throw new Error("Seeding cannot reset existing data. Set ALLOW_DATABASE_RESET=false.");
  }

  await ensureDatabaseIndexes();
  const db = await getMongoDb();
  const catalogs = await upsertSeedCatalogs(
    db.collection<VehicleDocument>("vehicles"),
    db.collection<ChargerDocument>("chargers"),
  );
  const admin = await createDevelopmentAdmin({
    email: adminEmail,
    password: adminPassword,
  });
  const seededCount = await upsertSeedAssessments(
    db.collection<AssessmentDocument>("assessments"),
  );

  console.log(`Seeded admin ${admin.email}.`);
  console.log(`Upserted ${catalogs.vehicles} vehicle manufacturers and ${catalogs.chargers} charger brands.`);
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
