import { faker } from "@faker-js/faker";
import { ObjectId, type BulkWriteResult, type Collection } from "mongodb";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssessmentDocument } from "../../src/repositories/assessments";
import { assessmentSectionsSchema } from "../../src/validation/assessment";
import { buildSeedAssessments, upsertSeedAssessments } from "../seed-assessments";

const referenceDate = new Date("2026-09-15T00:00:00.000Z");

afterEach(() => {
  vi.useRealTimers();
});

describe("seed assessment generation", () => {
  it("preserves 26 completed assessments and the 24 draft stopping points", () => {
    const assessments = buildSeedAssessments(referenceDate);
    const completed = assessments.filter((assessment) => assessment.status === "completed");
    const drafts = assessments.filter((assessment) => assessment.status === "draft");

    expect(assessments).toHaveLength(50);
    expect(completed).toHaveLength(26);
    expect(drafts.map((assessment) => assessment.lastCompletedStep)).toEqual([
      0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 2, 4, 5, 6,
    ]);
    for (const assessment of completed) {
      expect(assessment.currentStep).toBe(7);
      expect(assessment.lastCompletedStep).toBe(7);
      expect(assessmentSectionsSchema.safeParse(assessment.sections).success).toBe(true);
    }
    const sectionKeys = Object.keys(assessmentSectionsSchema.shape);
    for (const assessment of drafts) {
      expect(assessment.currentStep).toBe(assessment.lastCompletedStep + 1);
      expect(Object.keys(assessment.sections)).toEqual(sectionKeys.slice(0, assessment.lastCompletedStep));
      expect(assessmentSectionsSchema.partial().safeParse(assessment.sections).success).toBe(true);
      expect(assessment).not.toHaveProperty("completedAt");
    }
  });

  it.each([
    "2026-09-15T00:00:00.000Z",
    "2026-03-29T01:00:00.000Z",
    "2026-10-25T01:00:00.000Z",
    "2028-02-29T23:59:59.999Z",
  ])("orders every timestamp at reference instant %s", (instant) => {
    const now = new Date(instant);
    vi.useFakeTimers();
    vi.setSystemTime(now);

    for (const assessment of buildSeedAssessments()) {
      const { createdAt, updatedAt, lastActivityAt, completedAt } = assessment;
      expect(createdAt.getTime()).toBeLessThanOrEqual(lastActivityAt.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(updatedAt.getTime());

      for (const date of [createdAt, updatedAt, lastActivityAt, completedAt]) {
        if (date) expect(date.getTime()).toBeLessThanOrEqual(now.getTime());
      }

      if (assessment.status === "completed") {
        expect(completedAt).toBeInstanceOf(Date);
        expect(lastActivityAt.getTime()).toBeLessThanOrEqual(completedAt!.getTime());
        expect(updatedAt.getTime()).toBeLessThanOrEqual(completedAt!.getTime());
      }
    }
  });

  it("repeats deterministic sample values independently of global Faker state", () => {
    const firstRun = buildSeedAssessments(referenceDate);
    faker.seed(42);
    faker.person.fullName();
    const secondRun = buildSeedAssessments(referenceDate);

    expect(secondRun).toEqual(firstRun);
    expect(new Set(firstRun.map((assessment) => assessment.seedId)).size).toBe(50);
    expect(referenceDate.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });

  it("keeps seed identities and sample values stable when the reference date changes", () => {
    const firstRun = buildSeedAssessments(referenceDate);
    const laterRun = buildSeedAssessments(new Date("2026-09-16T00:00:00.000Z"));

    expect(laterRun.map(({ seedId, sections }) => ({ seedId, sections }))).toEqual(
      firstRun.map(({ seedId, sections }) => ({ seedId, sections })),
    );
  });
});

describe("seed assessment upserts", () => {
  it("refreshes only its samples across repeated runs and preserves IDs, tokens and other records", async () => {
    const assessments = buildSeedAssessments(referenceDate);
    // Same content as a sample, but no seed ID: must never match by customer data.
    const manual: AssessmentDocument = {
      ...assessments[0],
      _id: new ObjectId(),
      resumeTokenHash: "manual-token-hash",
      adminNotes: "Manually created assessment",
    };
    delete manual.seedId;
    const legacy: AssessmentDocument = { ...manual, _id: new ObjectId(), adminNotes: "Legacy sample" };
    const otherSeed: AssessmentDocument = { ...manual, _id: new ObjectId(), seedId: "another-script:0" };
    const documents = [manual, legacy, otherSeed];
    const untouched = documents.map((document) => ({ ...document }));

    const bulkWrite = vi.fn<Collection<AssessmentDocument>["bulkWrite"]>(async (operations) => {
      for (const operation of operations) {
        if (!("updateOne" in operation)) throw new Error("Only single-record upserts are allowed.");
        const { filter, update, upsert } = operation.updateOne;
        if (Array.isArray(update)) throw new Error("Unexpected update pipeline.");
        expect(upsert).toBe(true);
        expect(filter).toEqual({ seedId: update.$set?.seedId });
        expect(typeof filter.seedId).toBe("string");
        expect(update.$set).not.toHaveProperty("_id");
        expect(update.$set).not.toHaveProperty("resumeTokenHash");

        const existing = documents.find((document) => document.seedId === filter.seedId);
        const document = existing ?? {
          _id: new ObjectId(),
          ...update.$setOnInsert,
        } as AssessmentDocument;
        Object.assign(document, update.$set);
        for (const field of Object.keys(update.$unset ?? {})) {
          delete document[field as keyof AssessmentDocument];
        }
        if (!existing) documents.push(document);
      }
      return {} as BulkWriteResult;
    });

    expect(await upsertSeedAssessments({ bulkWrite }, referenceDate)).toBe(50);
    expect(documents).toHaveLength(53);
    const originalIdsAndTokens = documents.map(({ _id, resumeTokenHash }) => ({ _id, resumeTokenHash }));
    const seededDraft = documents.find((document) => document.seedId === "home-charging-sample:draft:0")!;
    // Reseeding restores this script's draft, including removing stale completion data.
    seededDraft.status = "completed";
    seededDraft.completedAt = referenceDate;
    seededDraft.adminNotes = "Edited sample";

    await upsertSeedAssessments({ bulkWrite }, referenceDate);
    expect(documents).toHaveLength(53);
    expect(documents.slice(3)).toMatchObject(assessments);
    expect(seededDraft).not.toHaveProperty("completedAt");
    const laterDate = new Date("2026-09-16T00:00:00.000Z");
    await upsertSeedAssessments({ bulkWrite }, laterDate);

    expect(bulkWrite).toHaveBeenCalledTimes(3);
    expect(documents).toHaveLength(53);
    expect(documents.slice(0, 3)).toEqual(untouched);
    expect(documents.slice(3)).toMatchObject(buildSeedAssessments(laterDate));
    expect(documents.map(({ _id, resumeTokenHash }) => ({ _id, resumeTokenHash }))).toEqual(originalIdsAndTokens);
    const tokenHashes = documents.slice(3).map((document) => document.resumeTokenHash);
    expect(new Set(tokenHashes).size).toBe(50);
    for (const hash of tokenHashes) expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
