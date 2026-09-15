import type { ZodType } from "zod";
import { failure, success } from "@/lib/result";
import type { ChargersResponse, VehiclesResponse } from "@/types/catalogs";
import type { Result } from "@/types/result";
import { chargersResponseSchema, vehiclesResponseSchema } from "@/validation/catalogs";

async function loadCatalog<T>(url: string, schema: ZodType<T>, message: string, signal?: AbortSignal): Promise<Result<T>> {
  try {
    const response = await fetch(url, { signal, credentials: "omit" });
    if (!response.ok) return failure("DATABASE_UNAVAILABLE", message);
    const payload = schema.safeParse(await response.json());
    return payload.success ? success(payload.data) : failure("DATABASE_UNAVAILABLE", message);
  } catch {
    // Network failures, invalid payloads and aborted requests never supply options.
    return failure("DATABASE_UNAVAILABLE", message);
  }
}

export function loadVehicleCatalog(signal?: AbortSignal): Promise<Result<VehiclesResponse>> {
  return loadCatalog("/api/vehicles", vehiclesResponseSchema, "Vehicle catalog is unavailable. Please try again.", signal);
}

export function loadChargerCatalog(signal?: AbortSignal): Promise<Result<ChargersResponse>> {
  return loadCatalog("/api/chargers", chargersResponseSchema, "Charger catalog is unavailable. Please try again.", signal);
}
