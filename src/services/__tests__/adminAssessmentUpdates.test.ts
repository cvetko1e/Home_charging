import { ObjectId, type Document, type FindOneAndUpdateOptions } from "mongodb";
import { assert, beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeAssessmentDraft,
  updateAssessmentDraftStep,
  updateAssessmentByAdmin,
  type AssessmentDocument,
} from "@/repositories/assessments";
import { updateAdminAssessment } from "@/services/adminAssessments";

const collectionMock = vi.hoisted(() => ({
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  getMongoDb: vi.fn(async () => ({
    collection: () => collectionMock,
  })),
}));

const incompletePersonalDetailsMessage =
  "Contact fields cannot be updated because the personal details section is missing or incomplete.";

const validPersonalDetails = {
  firstName: "Avery",
  lastName: "Stone",
  email: "avery@example.com",
  phoneNumber: "+1 555 123 4567",
};

let documents: Map<string, AssessmentDocument>;

const updatedAt = new Date("2026-06-01T12:00:00.000Z");
const draftUpdates = {
  currentStep: 2 as const,
  lastCompletedStep: 1,
  sections: { personalDetails: validPersonalDetails },
  updatedAt,
  lastActivityAt: updatedAt,
};
const completionUpdates = {
  status: "completed" as const,
  currentStep: 7 as const,
  lastCompletedStep: 7,
  updatedAt,
  lastActivityAt: updatedAt,
  completedAt: updatedAt,
};
const repositoryUpdates = [
  {
    name: "draft step",
    update: (id: string) => updateAssessmentDraftStep(id, draftUpdates),
    expected: draftUpdates,
  },
  {
    name: "completion",
    update: (id: string) => completeAssessmentDraft(id, completionUpdates),
    expected: completionUpdates,
  },
  {
    name: "admin notes",
    update: (id: string) => updateAssessmentByAdmin(id, { adminNotes: "Updated notes" }),
    expected: { adminNotes: "Updated notes" },
  },
];

describe("assessment updates", () => {
  beforeEach(() => {
    documents = new Map();
    collectionMock.findOne.mockReset();
    collectionMock.findOneAndUpdate.mockReset();

    collectionMock.findOne.mockImplementation(async (filter: Document) => {
      const id = filter._id;

      if (!(id instanceof ObjectId)) {
        return null;
      }

      return documents.get(id.toHexString()) ?? null;
    });

    collectionMock.findOneAndUpdate.mockImplementation(
      async (filter: Document, update: Document, options: FindOneAndUpdateOptions) => {
        const id = filter._id;

        if (!(id instanceof ObjectId)) {
          return null;
        }

        const document = documents.get(id.toHexString());

        if (!document || !matchesFilter(document, filter)) {
          return null;
        }

        const previousDocument = { ...document, sections: structuredClone(document.sections) };
        const setValues = update.$set as Record<string, unknown>;

        for (const [path, value] of Object.entries(setValues)) {
          setDotValue(document, path, value);
        }

        return options.returnDocument === "after" ? document : previousDocument;
      },
    );
  });

  it.each(repositoryUpdates)("returns the updated document atomically for $name", async ({ update, expected }) => {
    const assessment = storeAssessment(makeAssessmentDocument());

    const result = await update(assessment._id.toHexString());

    expect(result).toMatchObject({ _id: assessment._id, ...expected });
    expect(collectionMock.findOneAndUpdate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ _id: assessment._id }),
      { $set: expect.objectContaining(expected) },
      { returnDocument: "after" },
    );
    expect(collectionMock.findOne).not.toHaveBeenCalled();
  });

  it.each(repositoryUpdates)("returns null for a missing document on $name", async ({ update }) => {
    expect(await update(new ObjectId().toHexString())).toBeNull();
    expect(collectionMock.findOne).not.toHaveBeenCalled();
  });

  it.each(repositoryUpdates.slice(0, 2))("rejects $name for an already completed assessment", async ({ update }) => {
    const assessment = storeAssessment(makeAssessmentDocument({ status: "completed" }));
    const previousDocument = { ...assessment };

    expect(await update(assessment._id.toHexString())).toBeNull();
    expect(assessment).toEqual(previousDocument);
    expect(collectionMock.findOneAndUpdate.mock.calls[0][0]).toEqual({
      _id: assessment._id,
      status: "draft",
    });
  });

  it("still allows admin notes on a completed assessment", async () => {
    const assessment = storeAssessment(makeAssessmentDocument({ status: "completed" }));

    expect(await updateAssessmentByAdmin(assessment._id.toHexString(), {
      adminNotes: "Reviewed",
    })).toMatchObject({ status: "completed", adminNotes: "Reviewed" });
  });

  it("rejects a contact-field update for a draft without personalDetails", async () => {
    const assessment = storeAssessment(makeAssessmentDocument());

    await expect(
      updateAdminAssessment(assessment._id.toHexString(), {
        firstName: "Morgan",
      }),
    ).resolves.toMatchObject({ success: false, error: {
      code: "CONFLICT",
      message: incompletePersonalDetailsMessage,
    } });

    expect(collectionMock.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("does not create a partial personalDetails object after a rejected contact-field update", async () => {
    const assessment = storeAssessment(makeAssessmentDocument());

    await expect(
      updateAdminAssessment(assessment._id.toHexString(), {
        email: "morgan@example.com",
      }),
    ).resolves.toMatchObject({ success: false, error: {
      code: "CONFLICT",
    } });

    expect(assessment.sections.personalDetails).toBeUndefined();
  });

  it("uses the repository filter to avoid creating a missing personalDetails path", async () => {
    const assessment = storeAssessment(makeAssessmentDocument());

    const updatedDocument = await updateAssessmentByAdmin(
      assessment._id.toHexString(),
      {
        firstName: "Morgan",
      },
    );

    expect(updatedDocument).toBeNull();
    expect(assessment.sections.personalDetails).toBeUndefined();
    expect(collectionMock.findOneAndUpdate.mock.calls[0][0]).toHaveProperty(
      "sections.personalDetails",
      {
        $exists: true,
        $type: "object",
      },
    );
  });

  it("allows an adminNotes-only update without personalDetails", async () => {
    const assessment = storeAssessment(makeAssessmentDocument());

    const updatedAssessment = await updateAdminAssessment(
      assessment._id.toHexString(),
      {
        adminNotes: "Customer asked for a callback.",
      },
    );

    assert(updatedAssessment.success);
    expect(updatedAssessment.data.adminNotes).toBe("Customer asked for a callback.");
    expect(assessment.adminNotes).toBe("Customer asked for a callback.");
    expect(assessment.sections.personalDetails).toBeUndefined();
    expect(collectionMock.findOneAndUpdate.mock.calls[0][0]).not.toHaveProperty(
      "sections.personalDetails",
    );
  });

  it("updates contact fields when personalDetails already exists and is valid", async () => {
    const assessment = storeAssessment(
      makeAssessmentDocument({
        currentStep: 2,
        lastCompletedStep: 1,
        sections: {
          personalDetails: validPersonalDetails,
        },
      }),
    );

    const updatedAssessment = await updateAdminAssessment(
      assessment._id.toHexString(),
      {
        firstName: "Morgan",
        email: "morgan@example.com",
      },
    );

    assert(updatedAssessment.success);
    expect(updatedAssessment.data.sections.personalDetails).toEqual({
      ...validPersonalDetails,
      firstName: "Morgan",
      email: "morgan@example.com",
    });
    expect(assessment.sections.personalDetails).toEqual(
      updatedAssessment.data.sections.personalDetails,
    );

    const updateFilter = collectionMock.findOneAndUpdate.mock.calls[0][0] as Document;

    expect(updateFilter["sections.personalDetails"]).toEqual({
      $exists: true,
      $type: "object",
    });

    for (const field of ["firstName", "lastName", "email", "phoneNumber"]) {
      expect(updateFilter[`sections.personalDetails.${field}`]).toEqual({
        $exists: true,
        $type: "string",
      });
    }
  });

  it("rejects contact-field updates when existing personalDetails is incomplete", async () => {
    const assessment = storeAssessment(
      makeAssessmentDocument({
        sections: {
          personalDetails: {
            firstName: "Avery",
          } as AssessmentDocument["sections"]["personalDetails"],
        },
      }),
    );

    await expect(
      updateAdminAssessment(assessment._id.toHexString(), {
        lastName: "Stone",
      }),
    ).resolves.toMatchObject({ success: false, error: {
      code: "CONFLICT",
      message: incompletePersonalDetailsMessage,
    } });

    expect(collectionMock.findOneAndUpdate).not.toHaveBeenCalled();
    expect(assessment.sections.personalDetails).toEqual({
      firstName: "Avery",
    });
  });

  it("atomically refuses contact updates if personalDetails disappears after the service check", async () => {
    const assessment = storeAssessment(makeAssessmentDocument({
      sections: { personalDetails: { ...validPersonalDetails } },
    }));
    collectionMock.findOne.mockImplementationOnce(async () => {
      const snapshot = { ...assessment, sections: { ...assessment.sections } };
      assessment.sections = {};
      return snapshot;
    });

    await expect(updateAdminAssessment(assessment._id.toHexString(), {
      firstName: "Morgan",
    })).resolves.toMatchObject({ success: false, error: { code: "CONFLICT", message: incompletePersonalDetailsMessage } });
    expect(assessment.sections.personalDetails).toBeUndefined();
  });

  it("keeps the existing not-found behavior for missing assessments", async () => {
    await expect(
      updateAdminAssessment(new ObjectId().toHexString(), {
        firstName: "Morgan",
      }),
    ).resolves.toMatchObject({ success: false, error: {
      code: "NOT_FOUND",
      message: "Assessment was not found.",
    } });

    expect(collectionMock.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

function makeAssessmentDocument(
  overrides: Partial<AssessmentDocument> = {},
): AssessmentDocument {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    _id: new ObjectId(),
    status: "draft",
    currentStep: 1,
    lastCompletedStep: 0,
    sections: {},
    resumeTokenHash: "hashed-token",
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    ...overrides,
  };
}

function storeAssessment(document: AssessmentDocument) {
  documents.set(document._id.toHexString(), document);

  return document;
}

function matchesFilter(document: AssessmentDocument, filter: Document) {
  for (const [path, condition] of Object.entries(filter)) {
    if (path === "_id") {
      continue;
    }

    const value = getDotValue(document, path);

    if (isMongoCondition(condition)) {
      if (condition.$exists === true && value === undefined) {
        return false;
      }

      if (
        typeof condition.$type === "string" &&
        !matchesMongoType(value, condition.$type)
      ) {
        return false;
      }

      continue;
    }

    if (value !== condition) {
      return false;
    }
  }

  return true;
}

function isMongoCondition(value: unknown): value is {
  $exists?: boolean;
  $type?: string;
} {
  return typeof value === "object" && value !== null;
}

function matchesMongoType(value: unknown, type: string) {
  switch (type) {
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "string":
      return typeof value === "string";
    default:
      return true;
  }
}

function getDotValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, source);
}

function setDotValue(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  const finalKey = keys.pop();
  let current = target;

  if (!finalKey) {
    return;
  }

  for (const key of keys) {
    const nextValue = current[key];

    if (typeof nextValue !== "object" || nextValue === null) {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  }

  current[finalKey] = value;
}
