import { MongoServerSelectionError, ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as vehicles } from "@/app/api/vehicles/route";
import { GET as chargers } from "@/app/api/chargers/route";

const mocks = vi.hoisted(() => ({ find: vi.fn(), sort: vi.fn(), toArray: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({ getMongoDb: async () => ({ collection: () => ({ find: mocks.find }) }) }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.find.mockReturnValue({ sort: mocks.sort });
  mocks.sort.mockReturnValue({ toArray: mocks.toArray });
});
afterEach(() => vi.restoreAllMocks());

describe.each([
  { name: "vehicles", call: vehicles, publicData: [{ manufacturer: "Database Vehicle", models: [{ name: "Electric", years: [2028] }] }] },
  { name: "chargers", call: chargers, publicData: [{ brand: "Database Charger", models: ["Home"] }] },
])("GET /api/$name", ({ name, call, publicData }) => {
  it("returns the stable public envelope with bounded caching and no auth cookie", async () => {
    mocks.toArray.mockResolvedValue(publicData.map((entry) => ({ ...entry, _id: new ObjectId(), sortOrder: 4, adminNotes: "private" })));
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ [name]: publicData });
    expect(response.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=300");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.find).toHaveBeenCalledOnce();
  });

  it("does not cache empty catalogs as a usable result", async () => {
    mocks.toArray.mockResolvedValue([]);
    const response = await call();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { message: `${name === "vehicles" ? "Vehicle" : "Charger"} catalog is unavailable. Please try again.` } });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("preserves safe typed MongoDB error handling without caching failures", async () => {
    const error = new MongoServerSelectionError("mongodb://user:password@private-host", {} as ConstructorParameters<typeof MongoServerSelectionError>[1]);
    mocks.toArray.mockRejectedValue(error);
    const response = await call();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { message: "Database connection failed. Verify that MongoDB is running and MONGODB_URI is correct." } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("API request failed:", error);
  });

  it("logs unexpected errors while sending only the safe existing message", async () => {
    const error = new Error("database-url token private-stack");
    mocks.toArray.mockRejectedValue(error);
    const response = await call();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { message: "An unexpected error occurred." } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("API request failed:", error);
  });
});
