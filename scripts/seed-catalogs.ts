import type { Collection } from "mongodb";
import type { ChargerDocument, VehicleDocument } from "../src/repositories/catalogs";
import { chargerCatalog, vehicleCatalog } from "./catalog-seed-data";

export async function upsertSeedCatalogs(
  vehicles: Pick<Collection<VehicleDocument>, "bulkWrite">,
  chargers: Pick<Collection<ChargerDocument>, "bulkWrite">,
): Promise<{ vehicles: number; chargers: number }> {
  await Promise.all([
    vehicles.bulkWrite(vehicleCatalog.map(({ manufacturer, models }, sortOrder) => ({
      updateOne: {
        filter: { manufacturer },
        update: { $set: { manufacturer, models, sortOrder } },
        upsert: true,
      },
    }))),
    chargers.bulkWrite(chargerCatalog.map(({ brand, models }, sortOrder) => ({
      updateOne: {
        filter: { brand },
        update: { $set: { brand, models, sortOrder } },
        upsert: true,
      },
    }))),
  ]);
  return { vehicles: vehicleCatalog.length, chargers: chargerCatalog.length };
}
