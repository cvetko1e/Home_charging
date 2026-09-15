import { z } from "zod";
import { getChargerModels, getVehicleModels, getVehicleYears } from "@/lib/catalogs";
import type { ChargerCatalogEntry, VehicleCatalogEntry } from "@/types/catalogs";
import { evChargerSchema, vehicleDetailsSchema } from "@/validation/assessment";

const catalogName = z.string().trim().min(1).max(100);
export const vehiclesResponseSchema = z.object({
  vehicles: z.array(z.object({
    manufacturer: catalogName,
    models: z.array(z.object({
      name: catalogName,
      years: z.array(z.number().int().nonnegative()).min(1),
    })).min(1),
  })).min(1),
});

export const chargersResponseSchema = z.object({
  chargers: z.array(z.object({
    brand: catalogName,
    models: z.array(catalogName).min(1),
  })).min(1),
});

// Pure refinements: callers supply catalog data, never a database connection.
export function createVehicleSelectionSchema(catalog: VehicleCatalogEntry[]): typeof vehicleDetailsSchema {
  return vehicleDetailsSchema.superRefine((value, context) => {
    if (!catalog.some((entry) => entry.manufacturer === value.manufacturer)) {
      context.addIssue({ code: "custom", message: "Choose a listed manufacturer.", path: ["manufacturer"] });
      return;
    }
    if (!getVehicleModels(catalog, value.manufacturer).some((entry) => entry.name === value.model)) {
      context.addIssue({ code: "custom", message: "Choose a listed model for the selected manufacturer.", path: ["model"] });
      return;
    }
    if (!getVehicleYears(catalog, value.manufacturer, value.model).includes(value.year)) {
      context.addIssue({ code: "custom", message: "Choose a listed year for the selected model.", path: ["year"] });
    }
  });
}

export function createChargerSelectionSchema(catalog: ChargerCatalogEntry[]): typeof evChargerSchema {
  return evChargerSchema.superRefine((value, context) => {
    if (!value.wantsToPurchaseCharger || !value.chargerBrand) return;
    if (!catalog.some((entry) => entry.brand === value.chargerBrand)) {
      context.addIssue({ code: "custom", message: "Choose a listed charger brand.", path: ["chargerBrand"] });
      return;
    }
    if (value.chargerModel && !getChargerModels(catalog, value.chargerBrand).includes(value.chargerModel)) {
      context.addIssue({ code: "custom", message: "Choose a listed charger model for the selected brand.", path: ["chargerModel"] });
    }
  });
}
