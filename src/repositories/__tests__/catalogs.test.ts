import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCatalogIndexes, listChargers, listVehicles } from "@/repositories/catalogs";

const mocks = vi.hoisted(() => ({ collection: vi.fn(), find: vi.fn(), sort: vi.fn(), toArray: vi.fn(), createIndexes: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({ getMongoDb: async () => ({ collection: mocks.collection }) }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.collection.mockReturnValue({ find: mocks.find, createIndexes: mocks.createIndexes });
  mocks.find.mockReturnValue({ sort: mocks.sort });
  mocks.sort.mockReturnValue({ toArray: mocks.toArray });
});

describe("catalog repositories", () => {
  it("maps only public vehicle fields, preserving model/year ordering", async () => {
    const rows = [{ _id: new ObjectId(), manufacturer: "Database Motors", sortOrder: 8, internalNotes: "private", models: [
      { name: "Model B", years: [2030, 2029], internalPrice: 1200 },
      { name: "Model A", years: [2028] },
    ] }];
    mocks.toArray.mockResolvedValue(rows);
    const result = await listVehicles();
    expect(result).toEqual([{ manufacturer: "Database Motors", models: [
      { name: "Model B", years: [2030, 2029] }, { name: "Model A", years: [2028] },
    ] }]);
    expect(result[0].models[0].years).not.toBe(rows[0].models[0].years);
    expect(mocks.collection).toHaveBeenCalledExactlyOnceWith("vehicles");
    expect(mocks.find).toHaveBeenCalledExactlyOnceWith({}, { projection: { _id: 0, manufacturer: 1, "models.name": 1, "models.years": 1 } });
    expect(mocks.sort).toHaveBeenCalledExactlyOnceWith({ sortOrder: 1, manufacturer: 1 });
  });

  it("maps only public charger fields", async () => {
    const rows = [{ _id: new ObjectId(), brand: "Database Chargers", models: ["Fast", "Standard"], sortOrder: 1, adminNotes: "private" }];
    mocks.toArray.mockResolvedValue(rows);
    const result = await listChargers();
    expect(result).toEqual([{ brand: "Database Chargers", models: ["Fast", "Standard"] }]);
    expect(result[0].models).not.toBe(rows[0].models);
    expect(mocks.collection).toHaveBeenCalledExactlyOnceWith("chargers");
    expect(mocks.find).toHaveBeenCalledExactlyOnceWith({}, { projection: { _id: 0, brand: 1, models: 1 } });
    expect(mocks.sort).toHaveBeenCalledExactlyOnceWith({ sortOrder: 1, brand: 1 });
  });

  it("creates unique natural-key and ordering indexes", async () => {
    await createCatalogIndexes();
    expect(mocks.collection.mock.calls).toEqual([["vehicles"], ["chargers"]]);
    expect(mocks.createIndexes.mock.calls).toEqual([
      [[{ key: { manufacturer: 1 }, unique: true }, { key: { sortOrder: 1, manufacturer: 1 } }]],
      [[{ key: { brand: 1 }, unique: true }, { key: { sortOrder: 1, brand: 1 } }]],
    ]);
  });

  it("retains empty collections and original database failures for the service boundary", async () => {
    mocks.toArray.mockResolvedValue([]);
    await expect(listVehicles()).resolves.toEqual([]);
    const error = new Error("storage failure");
    mocks.toArray.mockRejectedValue(error);
    await expect(listChargers()).rejects.toBe(error);
  });
});
