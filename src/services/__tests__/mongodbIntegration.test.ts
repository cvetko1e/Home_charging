import { ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getMongoClient, getMongoDb } from "@/lib/mongodb";
import {
  completeAssessmentDraft,
  updateAssessmentByAdmin,
  updateAssessmentDraftStep,
} from "@/repositories/assessments";
import {
  completeAssessment,
  createAssessmentDraft,
  getAuthorizedAssessment,
  saveAssessmentStep,
} from "@/services/assessments";

const describeIntegration =
  process.env.RUN_MONGODB_INTEGRATION === "true" ? describe : describe.skip;

describeIntegration("MongoDB assessment flow smoke test", () => {
  let client: Awaited<ReturnType<typeof getMongoClient>> | undefined;

  beforeAll(async () => {
    if (!process.env.MONGODB_DB_NAME?.includes("test")) {
      throw new Error("MongoDB integration tests require a test database name.");
    }

    // Each test creates its own documents; never reset or delete existing data.
    client = await getMongoClient();
    const db = await getMongoDb();
    await db.command({ ping: 1 });
  });

  afterAll(async () => {
    await client?.close();
  });

  it("creates, saves, resumes, completes and rejects duplicate submission", async () => {
    const draft = await createAssessmentDraft();

    await saveAssessmentStep(draft.assessment.id, draft.resumeToken, 1, {
      firstName: "Morgan",
      lastName: "Lee",
      email: "morgan@example.com",
      phoneNumber: "+1 555 123 4567",
    });
    await saveAssessmentStep(draft.assessment.id, draft.resumeToken, 2, {
      manufacturer: "Tesla",
      model: "Model 3",
      year: 2024,
    });
    await saveAssessmentStep(draft.assessment.id, draft.resumeToken, 3, {
      panelLocation: "Garage",
      mainBreakerCapacity: 200,
      availableSlots: 4,
    });
    await saveAssessmentStep(draft.assessment.id, draft.resumeToken, 4, {
      proposedChargerLocation: "Inside garage",
      distanceFromPanel: 22,
    });
    await saveAssessmentStep(draft.assessment.id, draft.resumeToken, 5, {
      address: "100 Main Street",
      majorAppliances: ["water_heater"],
    });
    const review = await saveAssessmentStep(
      draft.assessment.id,
      draft.resumeToken,
      6,
      {
        wantsToPurchaseCharger: false,
      },
    );

    expect(review.currentStep).toBe(7);

    const resumed = await getAuthorizedAssessment(
      draft.assessment.id,
      draft.resumeToken,
    );
    expect(resumed.sections.personalDetails?.email).toBe("morgan@example.com");

    const completed = await completeAssessment(
      draft.assessment.id,
      draft.resumeToken,
    );
    expect(completed.status).toBe("completed");

    await expect(
      completeAssessment(draft.assessment.id, draft.resumeToken),
    ).rejects.toMatchObject({
      status: 409,
    });

    const db = await getMongoDb();
    const storedDocument = await db
      .collection("assessments")
      .findOne({ _id: new ObjectId(completed.id) });

    expect(storedDocument).not.toBeNull();
    expect(storedDocument?.resumeTokenHash).not.toBe(draft.resumeToken);
  });

  it("returns updated documents and preserves repository update restrictions", async () => {
    const { assessment } = await createAssessmentDraft();
    const id = assessment.id;
    const now = new Date();
    const draftUpdates = {
      currentStep: 2 as const,
      lastCompletedStep: 1,
      sections: {
        personalDetails: {
          firstName: "Morgan",
          lastName: "Lee",
          email: "morgan@example.com",
          phoneNumber: "+1 555 123 4567",
        },
      },
      updatedAt: now,
      lastActivityAt: now,
    };
    const completionUpdates = {
      status: "completed" as const,
      currentStep: 7 as const,
      lastCompletedStep: 7,
      updatedAt: now,
      lastActivityAt: now,
      completedAt: now,
    };

    expect(await updateAssessmentByAdmin(id, { firstName: "Alex" })).toBeNull();
    const notesOnly = await updateAssessmentByAdmin(id, { adminNotes: "Call customer" });
    expect(notesOnly?.adminNotes).toBe("Call customer");
    expect(notesOnly?.sections.personalDetails).toBeUndefined();

    expect(await updateAssessmentDraftStep(id, draftUpdates)).toMatchObject(draftUpdates);
    expect(await updateAssessmentByAdmin(id, { firstName: "Alex" })).toMatchObject({
      sections: { personalDetails: { ...draftUpdates.sections.personalDetails, firstName: "Alex" } },
    });
    expect(await completeAssessmentDraft(id, completionUpdates)).toMatchObject(completionUpdates);
    expect(await updateAssessmentDraftStep(id, draftUpdates)).toBeNull();
    expect(await completeAssessmentDraft(id, completionUpdates)).toBeNull();

    const missingId = new ObjectId().toHexString();
    expect(await updateAssessmentDraftStep(missingId, draftUpdates)).toBeNull();
    expect(await completeAssessmentDraft(missingId, completionUpdates)).toBeNull();
    expect(await updateAssessmentByAdmin(missingId, { adminNotes: "Missing" })).toBeNull();
  });
});
