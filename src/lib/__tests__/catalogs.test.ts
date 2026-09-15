import { describe, expect, it } from "vitest";
import { getChargerModels, getVehicleModels, getVehicleYears } from "@/lib/catalogs";
import { createChargerSelectionSchema, createVehicleSelectionSchema } from "@/validation/catalogs";

const vehicles = [
  { manufacturer: "New A", models: [{ name: "First", years: [2025, 2027] }, { name: "Shared", years: [2020] }] },
  { manufacturer: "New B", models: [{ name: "Shared", years: [2028] }] },
];
const chargers = [{ brand: "New A", models: ["One", "Two"] }, { brand: "New B", models: ["Three"] }];

describe("frontend catalog dependency helpers", () => {
  it("gets models only for the chosen manufacturer in catalog order", () => {
    expect(getVehicleModels(vehicles, "New A").map(({ name }) => name)).toEqual(["First", "Shared"]);
    expect(getVehicleModels(vehicles, "New B").map(({ name }) => name)).toEqual(["Shared"]);
    expect(getVehicleModels(vehicles, "")).toEqual([]);
    expect(getVehicleModels(vehicles, "unknown")).toEqual([]);
    expect(getVehicleModels([], "New A")).toEqual([]);
  });

  it("gets years for both manufacturer and model, preserving the stored order", () => {
    expect(getVehicleYears(vehicles, "New A", "First")).toEqual([2025, 2027]);
    expect(getVehicleYears(vehicles, "New A", "Shared")).toEqual([2020]);
    expect(getVehicleYears(vehicles, "New B", "Shared")).toEqual([2028]);
    expect(getVehicleYears(vehicles, "New B", "First")).toEqual([]);
    expect(getVehicleYears(vehicles, "", "")).toEqual([]);
  });

  it("gets charger models only from the selected brand", () => {
    expect(getChargerModels(chargers, "New A")).toEqual(["One", "Two"]);
    expect(getChargerModels(chargers, "New B")).toEqual(["Three"]);
    expect(getChargerModels(chargers, "missing")).toEqual([]);
    expect(getChargerModels([], "New A")).toEqual([]);
  });

  it("rejects cross-manufacturer years and cross-brand models in the client resolver", () => {
    const vehicleSchema = createVehicleSelectionSchema(vehicles);
    expect(vehicleSchema.safeParse({ manufacturer: "New A", model: "Shared", year: 2020 }).success).toBe(true);
    expect(vehicleSchema.safeParse({ manufacturer: "New A", model: "Shared", year: 2028 }).success).toBe(false);
    const chargerSchema = createChargerSelectionSchema(chargers);
    expect(chargerSchema.safeParse({ wantsToPurchaseCharger: true, chargerBrand: "New A", chargerModel: "Two" }).success).toBe(true);
    expect(chargerSchema.safeParse({ wantsToPurchaseCharger: true, chargerBrand: "New A", chargerModel: "Three" }).success).toBe(false);
  });
});
