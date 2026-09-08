import type { MajorAppliance } from "@/types/assessment";

export type VehicleCatalogModel = {
  name: string;
  years: number[];
};

export type VehicleCatalogEntry = {
  manufacturer: string;
  models: VehicleCatalogModel[];
};

export type ChargerCatalogEntry = {
  brand: string;
  models: string[];
};

export const vehicleCatalog: VehicleCatalogEntry[] = [
  {
    manufacturer: "Tesla",
    models: [
      { name: "Model 3", years: [2022, 2023, 2024, 2025, 2026] },
      { name: "Model Y", years: [2022, 2023, 2024, 2025, 2026] },
    ],
  },
  {
    manufacturer: "Hyundai",
    models: [
      { name: "Ioniq 5", years: [2022, 2023, 2024, 2025, 2026] },
      { name: "Kona Electric", years: [2021, 2022, 2023, 2024, 2025] },
    ],
  },
  {
    manufacturer: "Volkswagen",
    models: [
      { name: "ID.4", years: [2021, 2022, 2023, 2024, 2025] },
      { name: "ID. Buzz", years: [2024, 2025, 2026] },
    ],
  },
];

export const chargerCatalog: ChargerCatalogEntry[] = [
  {
    brand: "ChargePoint",
    models: ["Home Flex"],
  },
  {
    brand: "Wallbox",
    models: ["Pulsar Plus", "Pulsar Max"],
  },
  {
    brand: "Tesla",
    models: ["Universal Wall Connector", "Wall Connector"],
  },
];

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

export function getVehicleModels(manufacturer: string) {
  return (
    vehicleCatalog.find((entry) => entry.manufacturer === manufacturer)?.models ??
    []
  );
}

export function getVehicleYears(manufacturer: string, model: string) {
  return (
    getVehicleModels(manufacturer).find((entry) => entry.name === model)?.years ??
    []
  );
}

export function getChargerModels(brand: string) {
  return chargerCatalog.find((entry) => entry.brand === brand)?.models ?? [];
}
