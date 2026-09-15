// Initial data migrated verbatim from the application catalogs. Seed/test use only.
import type { VehicleCatalogEntry, ChargerCatalogEntry } from "../src/types/catalogs";

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
