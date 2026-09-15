import { ObjectId } from "mongodb";
import { assert, afterAll, beforeAll, describe, expect, it } from "vitest";
import { getMongoClient, getMongoDb } from "@/lib/mongodb";
import { listChargers, listVehicles } from "@/repositories/catalogs";
import { validateChargerChoice, validateVehicleChoice } from "@/services/catalogs";
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
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME?.includes("test")) {
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
    // Isolated catalog fixture; never upsert/seed an existing manufacturer's record.
    const manufacturer = `Integration vehicle ${new ObjectId().toHexString()}`;
    const db = await getMongoDb();
    await db.collection("vehicles").insertOne({ manufacturer, models: [{ name: "Test model", years: [2024] }] });
    const draft = await createAssessmentDraft();

    expect(await saveAssessmentStep(draft.assessment.id, draft.resumeToken, 1, {
      firstName: "Morgan",
      lastName: "Lee",
      email: "morgan@example.com",
      phoneNumber: "+1 555 123 4567",
    })).toMatchObject({ success: true });
    expect(await saveAssessmentStep(draft.assessment.id, draft.resumeToken, 2, {
      manufacturer,
      model: "Test model",
      year: 2024,
    })).toMatchObject({ success: true });
    expect(await saveAssessmentStep(draft.assessment.id, draft.resumeToken, 3, {
      panelLocation: "Garage",
      mainBreakerCapacity: 200,
      availableSlots: 4,
    })).toMatchObject({ success: true });
    expect(await saveAssessmentStep(draft.assessment.id, draft.resumeToken, 4, {
      proposedChargerLocation: "Inside garage",
      distanceFromPanel: 22,
    })).toMatchObject({ success: true });
    expect(await saveAssessmentStep(draft.assessment.id, draft.resumeToken, 5, {
      address: "100 Main Street",
      majorAppliances: ["water_heater"],
    })).toMatchObject({ success: true });
    const review = await saveAssessmentStep(
      draft.assessment.id,
      draft.resumeToken,
      6,
      {
        wantsToPurchaseCharger: false,
      },
    );

    assert(review.success);
    expect(review.data.currentStep).toBe(7);

    const resumed = await getAuthorizedAssessment(
      draft.assessment.id,
      draft.resumeToken,
    );
    assert(resumed.success);
    expect(resumed.data.sections.personalDetails?.email).toBe("morgan@example.com");

    const completed = await completeAssessment(
      draft.assessment.id,
      draft.resumeToken,
    );
    assert(completed.success);
    expect(completed.data.status).toBe("completed");

    await expect(
      completeAssessment(draft.assessment.id, draft.resumeToken),
    ).resolves.toMatchObject({ success: false, error: { code: "CONFLICT" } });

    const storedDocument = await db
      .collection("assessments")
      .findOne({ _id: new ObjectId(completed.data.id) });

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

  it("maps live catalog documents and validates their combinations", async () => {
    const unique = new ObjectId().toHexString();
    const manufacturer = `Integration ${unique}`;
    const brand = `Integration ${unique}`;
    const db = await getMongoDb();
    await db.collection("vehicles").insertOne({
      manufacturer, models: [{ name: "Test model", years: [2028], internalPrice: 123 }], sortOrder: 99, adminNotes: "internal",
    });
    await db.collection("chargers").insertOne({ brand, models: ["Test charger"], sortOrder: 99, adminNotes: "internal" });
    expect((await listVehicles()).find((entry) => entry.manufacturer === manufacturer)).toEqual({
      manufacturer, models: [{ name: "Test model", years: [2028] }],
    });
    expect((await listChargers()).find((entry) => entry.brand === brand)).toEqual({ brand, models: ["Test charger"] });
    expect((await validateVehicleChoice({ manufacturer, model: "Test model", year: 2028 })).success).toBe(true);
    expect((await validateVehicleChoice({ manufacturer, model: "Test model", year: 2029 })).success).toBe(false);
    expect((await validateChargerChoice({ wantsToPurchaseCharger: true, chargerBrand: brand, chargerModel: "Test charger" })).success).toBe(true);
    expect((await validateChargerChoice({ wantsToPurchaseCharger: true, chargerBrand: brand, chargerModel: "Wrong" })).success).toBe(false);
  });
});
