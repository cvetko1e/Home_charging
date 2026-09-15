import type { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import type { ChargerCatalogEntry, VehicleCatalogEntry } from "@/types/catalogs";

export type VehicleDocument = VehicleCatalogEntry & {
  _id: ObjectId;
  sortOrder?: number;
};

export type ChargerDocument = ChargerCatalogEntry & {
  _id: ObjectId;
  sortOrder?: number;
};

export async function createCatalogIndexes(): Promise<void> {
  const db = await getMongoDb();
  await Promise.all([
    db.collection<VehicleDocument>("vehicles").createIndexes([
      { key: { manufacturer: 1 }, unique: true },
      { key: { sortOrder: 1, manufacturer: 1 } },
    ]),
    db.collection<ChargerDocument>("chargers").createIndexes([
      { key: { brand: 1 }, unique: true },
      { key: { sortOrder: 1, brand: 1 } },
    ]),
  ]);
}

export async function listVehicles(): Promise<VehicleCatalogEntry[]> {
  const db = await getMongoDb();
  const documents = await db.collection<VehicleDocument>("vehicles")
    .find({}, { projection: { _id: 0, manufacturer: 1, "models.name": 1, "models.years": 1 } })
    .sort({ sortOrder: 1, manufacturer: 1 })
    .toArray();

  // Also whitelist in the mapper so nested/internal fields cannot reach a caller.
  return documents.map(({ manufacturer, models }) => ({
    manufacturer,
    models: models.map(({ name, years }) => ({ name, years: [...years] })),
  }));
}

export async function listChargers(): Promise<ChargerCatalogEntry[]> {
  const db = await getMongoDb();
  const documents = await db.collection<ChargerDocument>("chargers")
    .find({}, { projection: { _id: 0, brand: 1, models: 1 } })
    .sort({ sortOrder: 1, brand: 1 })
    .toArray();

  return documents.map(({ brand, models }) => ({ brand, models: [...models] }));
}
