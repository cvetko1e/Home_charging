import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";
import { getMongoClient, getMongoDb } from "../src/lib/mongodb";
import { shouldAllowDatabaseReset } from "../src/lib/env";
import {
  chargerCatalog,
  majorApplianceValues,
  vehicleCatalog,
} from "../src/lib/catalogs";
import { ensureDatabaseIndexes } from "../src/repositories/indexes";
import type { AssessmentDocument } from "../src/repositories/assessments";
import { createDevelopmentAdmin } from "../src/services/adminAuth";
import {
  createResumeToken,
  hashResumeToken,
} from "../src/services/assessments";
import { assessmentSectionsSchema } from "../src/validation/assessment";
import {
  reviewStepNumber,
  type AssessmentSections,
  type AssessmentStepNumber,
  type MajorAppliance,
} from "../src/types/assessment";
import { loadLocalEnv } from "./load-local-env";

faker.seed(20260908);

const assessmentCount = {
  completed: 26,
  drafts: 24,
};

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
  const assessments = buildSeedAssessments();

  await db.collection<AssessmentDocument>("assessments").insertMany(assessments);

  console.log(`Seeded admin ${admin.email}.`);
  console.log(
    `Inserted ${assessments.length} assessments (${assessmentCount.completed} completed, ${assessmentCount.drafts} drafts).`,
  );
}

function buildSeedAssessments() {
  const assessments: AssessmentDocument[] = [];

  for (let index = 0; index < assessmentCount.completed; index += 1) {
    assessments.push(createCompletedAssessment(index));
  }

  const stoppedSteps = [
    0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 2, 4, 5, 6,
  ];

  for (let index = 0; index < assessmentCount.drafts; index += 1) {
    assessments.push(createDraftAssessment(index, stoppedSteps[index] ?? 0));
  }

  return assessments;
}

function createCompletedAssessment(index: number): AssessmentDocument {
  const createdAt = daysAgo(45 - (index % 30));
  const completedAt = new Date(createdAt.getTime() + (index + 1) * 60 * 60 * 1000);
  const sections = buildCompleteSections(index);

  return {
    _id: new ObjectId(),
    status: "completed",
    currentStep: reviewStepNumber,
    lastCompletedStep: reviewStepNumber,
    sections,
    resumeTokenHash: hashResumeToken(createResumeToken()),
    adminNotes: index % 4 === 0 ? "Customer requested a morning callback." : "",
    createdAt,
    updatedAt: completedAt,
    lastActivityAt: completedAt,
    completedAt,
  };
}

function createDraftAssessment(
  index: number,
  lastCompletedStep: number,
): AssessmentDocument {
  const createdAt = daysAgo(30 - (index % 25));
  const lastActivityAt = daysAgo(index % 3 === 0 ? 12 + index : index + 1);
  const currentStep =
    lastCompletedStep === 0
      ? 1
      : lastCompletedStep === 6
        ? reviewStepNumber
        : ((lastCompletedStep + 1) as AssessmentStepNumber);

  return {
    _id: new ObjectId(),
    status: "draft",
    currentStep,
    lastCompletedStep,
    sections: buildPartialSections(index, lastCompletedStep),
    resumeTokenHash: hashResumeToken(createResumeToken()),
    adminNotes: index % 5 === 0 ? "Follow up if the draft stays inactive." : "",
    createdAt,
    updatedAt: lastActivityAt,
    lastActivityAt,
  };
}

function buildPartialSections(index: number, lastCompletedStep: number) {
  const sections = buildCompleteSections(index);
  const partial: AssessmentSections = {};

  if (lastCompletedStep >= 1) {
    partial.personalDetails = sections.personalDetails;
  }

  if (lastCompletedStep >= 2) {
    partial.vehicleDetails = sections.vehicleDetails;
  }

  if (lastCompletedStep >= 3) {
    partial.electricalPanel = sections.electricalPanel;
  }

  if (lastCompletedStep >= 4) {
    partial.chargerInstallation = sections.chargerInstallation;
  }

  if (lastCompletedStep >= 5) {
    partial.homeInformation = sections.homeInformation;
  }

  if (lastCompletedStep >= 6) {
    partial.evCharger = sections.evCharger;
  }

  return partial;
}

function buildCompleteSections(index: number) {
  const vehicleEntry = faker.helpers.arrayElement(vehicleCatalog);
  const modelEntry = faker.helpers.arrayElement(vehicleEntry.models);
  const chargerEntry = faker.helpers.arrayElement(chargerCatalog);
  const wantsCharger = index % 3 !== 0;
  const sections = {
    personalDetails: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      phoneNumber: `+1 555 ${String(100 + index).padStart(3, "0")} ${String(
        1000 + index,
      ).padStart(4, "0")}`,
    },
    vehicleDetails: {
      manufacturer: vehicleEntry.manufacturer,
      model: modelEntry.name,
      year: faker.helpers.arrayElement(modelEntry.years),
    },
    electricalPanel: {
      panelLocation: faker.helpers.arrayElement([
        "Garage",
        "Basement",
        "Utility room",
        "Exterior wall",
      ]),
      mainBreakerCapacity: faker.helpers.arrayElement([100, 125, 150, 200]),
      availableSlots: faker.number.int({ min: 0, max: 8 }),
    },
    chargerInstallation: {
      proposedChargerLocation: faker.helpers.arrayElement([
        "Inside garage",
        "Driveway wall",
        "Carport",
        "Detached garage",
      ]),
      distanceFromPanel: faker.number.int({ min: 5, max: 85 }),
    },
    homeInformation: {
      address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state(
        { abbreviated: true },
      )}`,
      majorAppliances: faker.helpers.arrayElements(
        majorApplianceValues,
        faker.number.int({ min: 1, max: 3 }),
      ) as MajorAppliance[],
    },
    evCharger: {
      wantsToPurchaseCharger: wantsCharger,
      chargerBrand: wantsCharger ? chargerEntry.brand : undefined,
      chargerModel: wantsCharger
        ? faker.helpers.arrayElement(chargerEntry.models)
        : undefined,
    },
  };

  return assessmentSectionsSchema.parse(sections);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9 + (days % 8), 30, 0, 0);

  return date;
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
