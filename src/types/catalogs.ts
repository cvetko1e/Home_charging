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

export type VehiclesResponse = { vehicles: VehicleCatalogEntry[] };
export type ChargersResponse = { chargers: ChargerCatalogEntry[] };
