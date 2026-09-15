import { ObjectId, type BulkWriteResult, type Collection } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { upsertSeedCatalogs } from "../seed-catalogs";
import { chargerCatalog, vehicleCatalog } from "../catalog-seed-data";
import { buildSeedAssessments } from "../seed-assessments";
import type { ChargerDocument, VehicleDocument } from "../../src/repositories/catalogs";
import { createChargerSelectionSchema, createVehicleSelectionSchema } from "../../src/validation/catalogs";

function collectionMock<T extends VehicleDocument | ChargerDocument>(key: "manufacturer" | "brand", initial: T[]) {
  const documents = initial;
  const bulkWrite = vi.fn<Collection<T>["bulkWrite"]>(async (operations) => {
    for (const operation of operations) {
      if (!("updateOne" in operation)) throw new Error("Only upserts are permitted.");
      const { filter, update, upsert } = operation.updateOne;
      if (Array.isArray(update)) throw new Error("Unexpected pipeline.");
      expect(upsert).toBe(true);
      expect(Object.keys(update)).toEqual(["$set"]);
      expect(filter).toEqual({ [key]: update.$set?.[key] });
      expect(update.$set).not.toHaveProperty("_id");
      const existing = documents.find((entry) => (entry as Record<string, unknown>)[key] === (filter as Record<string, unknown>)[key]);
      const document = existing ?? { _id: new ObjectId() } as T;
      Object.assign(document, structuredClone(update.$set));
      if (!existing) documents.push(document);
    }
    return {} as BulkWriteResult;
  });
  return { bulkWrite, documents };
}

describe("catalog seeding", () => {
  it("upserts stable natural keys without duplicates or replacing IDs/manual records", async () => {
    const manualVehicle: VehicleDocument = { _id: new ObjectId(), manufacturer: "Manual", models: [{ name: "Manual", years: [2024] }] };
    const manualCharger: ChargerDocument = { _id: new ObjectId(), brand: "Manual", models: ["Manual"] };
    const vehicles = collectionMock("manufacturer", [manualVehicle]);
    const chargers = collectionMock("brand", [manualCharger]);
    await expect(upsertSeedCatalogs(vehicles, chargers)).resolves.toEqual({ vehicles: 3, chargers: 3 });
    const ids = [...vehicles.documents, ...chargers.documents].map(({ _id }) => _id.toHexString());
    vehicles.documents[1].models = [];
    chargers.documents[1].models = [];
    await upsertSeedCatalogs(vehicles, chargers);
    await upsertSeedCatalogs(vehicles, chargers);
    expect(vehicles.documents).toHaveLength(4);
    expect(chargers.documents).toHaveLength(4);
    expect([...vehicles.documents, ...chargers.documents].map(({ _id }) => _id.toHexString())).toEqual(ids);
    expect(vehicles.documents[0]).toBe(manualVehicle);
    expect(chargers.documents[0]).toBe(manualCharger);
    expect(manualVehicle.models).toEqual([{ name: "Manual", years: [2024] }]);
    expect(manualCharger.models).toEqual(["Manual"]);
    expect(vehicles.documents.slice(1)).toMatchObject(vehicleCatalog.map((entry, sortOrder) => ({ ...entry, sortOrder })));
    expect(chargers.documents.slice(1)).toMatchObject(chargerCatalog.map((entry, sortOrder) => ({ ...entry, sortOrder })));
  });

  it("retains the original dropdown order and valid sample assessment choices", () => {
    expect(vehicleCatalog.map(({ manufacturer }) => manufacturer)).toEqual(["Tesla", "Hyundai", "Volkswagen"]);
    expect(chargerCatalog.map(({ brand }) => brand)).toEqual(["ChargePoint", "Wallbox", "Tesla"]);
    for (const { sections } of buildSeedAssessments(new Date("2026-09-15T00:00:00Z"))) {
      if (sections.vehicleDetails) expect(createVehicleSelectionSchema(vehicleCatalog).safeParse(sections.vehicleDetails).success).toBe(true);
      if (sections.evCharger) expect(createChargerSelectionSchema(chargerCatalog).safeParse(sections.evCharger).success).toBe(true);
    }
  });
});
