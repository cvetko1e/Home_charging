import { MongoServerSelectionError, ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listChargers, listVehicles } from "@/repositories/catalogs";
import { findAssessmentById, updateAssessmentDraftStep } from "@/repositories/assessments";
import { getChargerCatalog, getVehicleCatalog, validateChargerChoice, validateVehicleChoice } from "@/services/catalogs";
import { saveAssessmentStep } from "@/services/assessments";
import { hashSecret } from "@/lib/security";
import type { ChargerCatalogEntry, VehicleCatalogEntry } from "@/types/catalogs";
import type { AssessmentDocument } from "@/repositories/assessments";

vi.mock("@/repositories/catalogs", () => ({ listVehicles: vi.fn(), listChargers: vi.fn() }));
vi.mock("@/repositories/assessments", () => ({ findAssessmentById: vi.fn(), updateAssessmentDraftStep: vi.fn() }));

const vehicles: VehicleCatalogEntry[] = [
  { manufacturer: "New Manufacturer", models: [{ name: "Model One", years: [2027, 2028] }, { name: "Model Two", years: [2029] }] },
  { manufacturer: "Second Manufacturer", models: [{ name: "Model Three", years: [2028] }] },
];
const chargers: ChargerCatalogEntry[] = [
  { brand: "New Brand", models: ["Charger One"] }, { brand: "Second Brand", models: ["Charger Two"] },
];
const vehicle = { manufacturer: "New Manufacturer", model: "Model One", year: 2028 };
const charger = { wantsToPurchaseCharger: true, chargerBrand: "New Brand", chargerModel: "Charger One" };
const id = "507f1f77bcf86cd799439011";
const token = "a".repeat(43);
const document: AssessmentDocument = {
  _id: new ObjectId(id), status: "draft", currentStep: 2, lastCompletedStep: 1, sections: {},
  resumeTokenHash: hashSecret(token), createdAt: new Date(), updatedAt: new Date(), lastActivityAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listVehicles).mockResolvedValue(vehicles);
  vi.mocked(listChargers).mockResolvedValue(chargers);
  vi.mocked(findAssessmentById).mockResolvedValue(document);
  vi.mocked(updateAssessmentDraftStep).mockResolvedValue(document);
});

describe("catalog choice validation", () => {
  it("accepts new combinations that exist only in MongoDB", async () => {
    await expect(validateVehicleChoice(vehicle)).resolves.toEqual({ success: true, data: vehicle });
    await expect(validateChargerChoice(charger)).resolves.toEqual({ success: true, data: charger });
  });

  it.each([
    [{ manufacturer: "Tesla" }, "manufacturer", "Choose a listed manufacturer."],
    [{ model: "Model Three" }, "model", "Choose a listed model for the selected manufacturer."],
    [{ year: 2029 }, "year", "Choose a listed year for the selected model."],
  ])("rejects invalid vehicle combinations: %j", async (change, field, message) => {
    await expect(validateVehicleChoice({ ...vehicle, ...change })).resolves.toMatchObject({ success: false, error: {
      code: "VALIDATION_ERROR", message: "Validation failed.", details: { formErrors: [], fieldErrors: { [field as string]: [message] } },
    } });
  });

  it.each([
    [{ chargerBrand: "Wallbox" }, "chargerBrand", "Choose a listed charger brand."],
    [{ chargerModel: "Charger Two" }, "chargerModel", "Choose a listed charger model for the selected brand."],
  ])("rejects invalid charger combinations: %j", async (change, field, message) => {
    await expect(validateChargerChoice({ ...charger, ...change })).resolves.toMatchObject({ success: false, error: {
      code: "VALIDATION_ERROR", message: "Validation failed.", details: { formErrors: [], fieldErrors: { [field as string]: [message] } },
    } });
  });

  it("does not consult catalogs for invalid structure or a non-purchase", async () => {
    expect((await validateVehicleChoice({ ...vehicle, year: 1.5 })).success).toBe(false);
    expect((await validateChargerChoice({ wantsToPurchaseCharger: true })).success).toBe(false);
    await expect(validateChargerChoice({ wantsToPurchaseCharger: false })).resolves.toEqual({ success: true, data: { wantsToPurchaseCharger: false } });
    expect(listVehicles).not.toHaveBeenCalled();
    expect(listChargers).not.toHaveBeenCalled();
  });

  it("returns typed unavailability for empty or incomplete catalogs", async () => {
    vi.mocked(listVehicles).mockResolvedValue([]);
    vi.mocked(listChargers).mockResolvedValue([{ brand: "Empty", models: [] }]);
    for (const result of [await getVehicleCatalog(), await getChargerCatalog()]) {
      expect(result).toMatchObject({ success: false, error: { code: "DATABASE_UNAVAILABLE" } });
    }
  });

  it("uses a fresh repository read when validating a changed catalog", async () => {
    expect((await validateVehicleChoice(vehicle)).success).toBe(true);
    vi.mocked(listVehicles).mockResolvedValue([vehicles[1]]);
    expect((await validateVehicleChoice(vehicle)).success).toBe(false);
    expect(listVehicles).toHaveBeenCalledTimes(2);
  });
});

describe("assessment saves enforce MongoDB catalog membership", () => {
  it.each([{ step: 2 as const, data: vehicle, section: "vehicleDetails" }, { step: 6 as const, data: charger, section: "evCharger" }])(
    "saves valid choices at step $step without changing the answer format", async ({ step, data, section }) => {
      expect((await saveAssessmentStep(id, token, step, data)).success).toBe(true);
      expect(updateAssessmentDraftStep).toHaveBeenCalledExactlyOnceWith(id, expect.objectContaining({ sections: { [section]: data } }));
    },
  );

  it.each([{ step: 2 as const, data: { ...vehicle, year: 2000 } }, { step: 6 as const, data: { ...charger, chargerModel: "arbitrary" } }])(
    "never writes invalid choices at step $step", async ({ step, data }) => {
      await expect(saveAssessmentStep(id, token, step, data)).resolves.toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } });
      expect(updateAssessmentDraftStep).not.toHaveBeenCalled();
    },
  );

  it.each([2, 6] as const)("never writes choices when the step %s catalog is unavailable", async (step) => {
    vi.mocked(listVehicles).mockResolvedValue([]);
    vi.mocked(listChargers).mockResolvedValue([]);
    await expect(saveAssessmentStep(id, token, step, step === 2 ? vehicle : charger)).resolves.toMatchObject({ success: false, error: { code: "DATABASE_UNAVAILABLE" } });
    expect(updateAssessmentDraftStep).not.toHaveBeenCalled();
  });

  it("propagates connection failures before any write", async () => {
    const error = new MongoServerSelectionError("unavailable", {} as ConstructorParameters<typeof MongoServerSelectionError>[1]);
    vi.mocked(listVehicles).mockRejectedValue(error);
    await expect(saveAssessmentStep(id, token, 2, vehicle)).rejects.toBe(error);
    expect(updateAssessmentDraftStep).not.toHaveBeenCalled();
  });

  it("preserves declining a charger when its catalog is unavailable", async () => {
    vi.mocked(listChargers).mockResolvedValue([]);
    expect((await saveAssessmentStep(id, token, 6, { wantsToPurchaseCharger: false })).success).toBe(true);
    expect(listChargers).not.toHaveBeenCalled();
  });

  it("does not save forged charger values hidden behind a non-purchase", async () => {
    expect((await saveAssessmentStep(id, token, 6, {
      wantsToPurchaseCharger: false, chargerBrand: "arbitrary", chargerModel: "arbitrary",
    })).success).toBe(true);
    expect(updateAssessmentDraftStep).toHaveBeenCalledWith(id, expect.objectContaining({
      sections: { evCharger: { wantsToPurchaseCharger: false } },
    }));
    expect(listChargers).not.toHaveBeenCalled();
  });
});
