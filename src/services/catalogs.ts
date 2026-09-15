import { failure, success, validationFailure } from "@/lib/result";
import { listChargers, listVehicles } from "@/repositories/catalogs";
import type { EvCharger, VehicleDetails } from "@/types/assessment";
import type { ChargersResponse, VehiclesResponse } from "@/types/catalogs";
import type { Result } from "@/types/result";
import { evChargerSchema, vehicleDetailsSchema } from "@/validation/assessment";
import { chargersResponseSchema, createChargerSelectionSchema, createVehicleSelectionSchema, vehiclesResponseSchema } from "@/validation/catalogs";

export async function getVehicleCatalog(): Promise<Result<VehiclesResponse>> {
  const vehicles = await listVehicles();
  const parsed = vehiclesResponseSchema.safeParse({ vehicles });
  if (!parsed.success) {
    return failure("DATABASE_UNAVAILABLE", "Vehicle catalog is unavailable. Please try again.");
  }
  return success(parsed.data);
}

export async function getChargerCatalog(): Promise<Result<ChargersResponse>> {
  const chargers = await listChargers();
  const parsed = chargersResponseSchema.safeParse({ chargers });
  if (!parsed.success) {
    return failure("DATABASE_UNAVAILABLE", "Charger catalog is unavailable. Please try again.");
  }
  return success(parsed.data);
}

export async function validateVehicleChoice(data: unknown): Promise<Result<VehicleDetails>> {
  const structure = vehicleDetailsSchema.safeParse(data);
  if (!structure.success) return validationFailure(structure.error);
  // Always query MongoDB here; browser/proxy caches are for dropdown reads only.
  const catalog = await getVehicleCatalog();
  if (!catalog.success) return catalog;
  const selection = createVehicleSelectionSchema(catalog.data.vehicles).safeParse(structure.data);
  return selection.success ? success(selection.data) : validationFailure(selection.error);
}

export async function validateChargerChoice(data: unknown): Promise<Result<EvCharger>> {
  const structure = evChargerSchema.safeParse(data);
  if (!structure.success) return validationFailure(structure.error);
  // No catalog choice is needed for a non-purchase. Ignore hidden/forged choice
  // fields just as the form clears them when the checkbox is unchecked.
  if (!structure.data.wantsToPurchaseCharger) return success({ wantsToPurchaseCharger: false });
  const catalog = await getChargerCatalog();
  if (!catalog.success) return catalog;
  const selection = createChargerSelectionSchema(catalog.data.chargers).safeParse(structure.data);
  return selection.success ? success(selection.data) : validationFailure(selection.error);
}
