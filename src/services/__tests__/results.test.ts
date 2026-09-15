import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSecret } from "@/lib/security";
import * as repository from "@/repositories/assessments";
import { getAuthorizedAssessment, saveAssessmentStep, completeAssessment } from "@/services/assessments";
import { parseAssessmentListSearchParams, updateAdminAssessment } from "@/services/adminAssessments";

vi.mock("@/repositories/assessments", () => ({
  findAssessmentById: vi.fn(), updateAssessmentDraftStep: vi.fn(), completeAssessmentDraft: vi.fn(),
  findAssessmentForAdmin: vi.fn(), updateAssessmentByAdmin: vi.fn(),
}));

const id = "507f1f77bcf86cd799439011";
const token = "a".repeat(43);
const personalDetails = { firstName: "Morgan", lastName: "Lee", email: "morgan@example.com", phoneNumber: "+1 555 123 4567" };
const document: repository.AssessmentDocument = {
  _id: new ObjectId(id), status: "draft", currentStep: 1, lastCompletedStep: 0, sections: {},
  resumeTokenHash: hashSecret(token), createdAt: new Date(), updatedAt: new Date(), lastActivityAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(repository.findAssessmentById).mockResolvedValue(document);
});

describe("expected service outcomes use Result without throwing", () => {
  it("returns a typed missing assessment outcome", async () => {
    vi.mocked(repository.findAssessmentById).mockResolvedValue(null);
    await expect(getAuthorizedAssessment(id, token)).resolves.toMatchObject({
      success: false, error: { code: "NOT_FOUND", message: "Assessment was not found or the resume token is invalid." },
    });
  });

  it("returns Zod validation details for invalid step data", async () => {
    await expect(saveAssessmentStep(id, token, 1, { ...personalDetails, firstName: "" })).resolves.toEqual({
      success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed.", details: {
        formErrors: [], fieldErrors: { firstName: ["First name is required."] },
      } },
    });
    expect(repository.updateAssessmentDraftStep).not.toHaveBeenCalled();
  });

  it("retains the no-match update message", async () => {
    vi.mocked(repository.updateAssessmentDraftStep).mockResolvedValue(null);
    await expect(saveAssessmentStep(id, token, 1, personalDetails)).resolves.toMatchObject({
      success: false, error: { code: "NOT_FOUND", message: "Assessment could not be updated." },
    });
  });

  it("retains the no-match submission message", async () => {
    vi.mocked(repository.findAssessmentById).mockResolvedValue({ ...document, sections: {
      personalDetails, vehicleDetails: { manufacturer: "Tesla", model: "Model 3", year: 2024 },
      electricalPanel: { panelLocation: "Garage", mainBreakerCapacity: 200, availableSlots: 4 },
      chargerInstallation: { proposedChargerLocation: "Garage", distanceFromPanel: 22 },
      homeInformation: { address: "100 Main Street", majorAppliances: ["water_heater"] },
      evCharger: { wantsToPurchaseCharger: false },
    } });
    vi.mocked(repository.completeAssessmentDraft).mockResolvedValue(null);
    await expect(completeAssessment(id, token)).resolves.toMatchObject({
      success: false, error: { code: "NOT_FOUND", message: "Assessment could not be submitted." },
    });
  });

  it("rejects empty updates even when called outside a route", async () => {
    await expect(updateAdminAssessment(id, {})).resolves.toMatchObject({
      success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed.", details: {
        formErrors: ["At least one editable field is required."], fieldErrors: {},
      } },
    });
    expect(repository.updateAssessmentByAdmin).not.toHaveBeenCalled();
  });

  it("returns query validation failure without throwing", () => {
    expect(parseAssessmentListSearchParams(new URLSearchParams({ page: "0" }))).toMatchObject({
      success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed.", details: {
        formErrors: [], fieldErrors: { page: [expect.any(String)] },
      } },
    });
  });

  it("lets unexpected repository failures reach the caller intact", async () => {
    const error = new Error("unexpected storage failure");
    vi.mocked(repository.findAssessmentById).mockRejectedValue(error);
    await expect(getAuthorizedAssessment(id, token)).rejects.toBe(error);
  });
});
