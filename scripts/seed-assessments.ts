import { base, en, Faker } from "@faker-js/faker";
import type { Collection } from "mongodb";
import {
  chargerCatalog,
  majorApplianceValues,
  vehicleCatalog,
} from "../src/lib/catalogs";
import { createOpaqueToken, hashSecret } from "../src/lib/security";
import type { AssessmentDocument } from "../src/repositories/assessments";
import { assessmentSectionsSchema } from "../src/validation/assessment";
import {
  reviewStepNumber,
  type AssessmentSections,
  type AssessmentStepNumber,
  type MajorAppliance,
} from "../src/types/assessment";
export const assessmentCount = {
  completed: 26,
  drafts: 24,
};

type SeedAssessment = Omit<AssessmentDocument, "_id" | "resumeTokenHash"> & {
  seedId: string;
};

export async function upsertSeedAssessments(
  collection: Pick<Collection<AssessmentDocument>, "bulkWrite">,
  now = new Date(),
) {
  const assessments = buildSeedAssessments(now);

  await collection.bulkWrite(
    assessments.map((assessment) => ({
      updateOne: {
        filter: { seedId: assessment.seedId },
        update: {
          $set: assessment,
          // Keep existing IDs and credentials when refreshing seed-owned samples.
          $setOnInsert: { resumeTokenHash: hashSecret(createOpaqueToken()) },
          ...(assessment.status === "draft" ? { $unset: { completedAt: "" } } : {}),
        },
        upsert: true,
      },
    })),
  );

  return assessments.length;
}

export function buildSeedAssessments(now = new Date()): SeedAssessment[] {
  const faker = new Faker({ locale: [en, base] });
  faker.seed(20260908);
  const assessments: SeedAssessment[] = [];

  for (let index = 0; index < assessmentCount.completed; index += 1) {
    assessments.push(createCompletedAssessment(index, now, faker));
  }

  const stoppedSteps = [
    0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 2, 4, 5, 6,
  ];

  for (let index = 0; index < assessmentCount.drafts; index += 1) {
    assessments.push(createDraftAssessment(index, stoppedSteps[index] ?? 0, now, faker));
  }

  return assessments;
}

function createCompletedAssessment(index: number, now: Date, faker: Faker): SeedAssessment {
  const createdAt = daysAgo(45 - (index % 30), now);
  const completedAt = new Date(
    Math.min(now.getTime(), createdAt.getTime() + (index + 1) * 60 * 60 * 1000),
  );
  const sections = buildCompleteSections(index, faker);

  return {
    seedId: `home-charging-sample:completed:${index}`,
    status: "completed",
    currentStep: reviewStepNumber,
    lastCompletedStep: reviewStepNumber,
    sections,
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
  now: Date,
  faker: Faker,
): SeedAssessment {
  const createdAt = daysAgo(30 - (index % 25), now);
  const lastActivityAt = new Date(
    Math.max(
      createdAt.getTime(),
      daysAgo(index % 3 === 0 ? 12 + index : index + 1, now).getTime(),
    ),
  );
  const currentStep =
    lastCompletedStep === 0
      ? 1
      : lastCompletedStep === 6
        ? reviewStepNumber
        : ((lastCompletedStep + 1) as AssessmentStepNumber);

  return {
    seedId: `home-charging-sample:draft:${index}`,
    status: "draft",
    currentStep,
    lastCompletedStep,
    sections: buildPartialSections(index, lastCompletedStep, faker),
    adminNotes: index % 5 === 0 ? "Follow up if the draft stays inactive." : "",
    createdAt,
    updatedAt: lastActivityAt,
    lastActivityAt,
  };
}

function buildPartialSections(index: number, lastCompletedStep: number, faker: Faker) {
  const sections = buildCompleteSections(index, faker);
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

function buildCompleteSections(index: number, faker: Faker) {
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

function daysAgo(days: number, now: Date) {
  // Elapsed days keep the single reference instant independent of local DST.
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
