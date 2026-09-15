import type { MajorAppliance } from "@/types/assessment";
import type { VehicleCatalogEntry, VehicleCatalogModel, ChargerCatalogEntry } from "@/types/catalogs";

export const majorApplianceValues = [
  "water_heater",
  "air_conditioner",
  "electric_heating",
  "electric_dryer",
  "pool_pump",
  "other",
] as const satisfies readonly MajorAppliance[];

export const majorApplianceOptions: Array<{
  label: string;
  value: MajorAppliance;
}> = [
  { label: "Water heater", value: "water_heater" },
  { label: "Air conditioner", value: "air_conditioner" },
  { label: "Electric heating", value: "electric_heating" },
  { label: "Electric dryer", value: "electric_dryer" },
  { label: "Pool pump", value: "pool_pump" },
  { label: "Other high-consumption appliance", value: "other" },
];

export function getVehicleModels(catalog: VehicleCatalogEntry[], manufacturer: string): VehicleCatalogModel[] {
  return (
    catalog.find((entry) => entry.manufacturer === manufacturer)?.models ??
    []
  );
}

export function getVehicleYears(catalog: VehicleCatalogEntry[], manufacturer: string, model: string): number[] {
  return (
    getVehicleModels(catalog, manufacturer).find((entry) => entry.name === model)?.years ??
    []
  );
}

export function getChargerModels(catalog: ChargerCatalogEntry[], brand: string): string[] {
  return catalog.find((entry) => entry.brand === brand)?.models ?? [];
}
