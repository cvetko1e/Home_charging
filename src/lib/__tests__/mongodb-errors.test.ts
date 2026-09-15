import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("MongoDB configuration and connection errors", () => {
  it.each(["MONGODB_URI", "MONGODB_DB_NAME"] as const)("produces a typed error for missing %s before connecting", async (variable) => {
    vi.resetModules();
    const { MongoClient } = await import("mongodb");
    const connect = vi.spyOn(MongoClient.prototype, "connect");
    const { getMongoDb } = await import("@/lib/mongodb");
    const { DatabaseConfigurationError } = await import("@/lib/database-errors");
    vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017");
    vi.stubEnv("MONGODB_DB_NAME", "configuration_test");
    vi.stubEnv(variable, "");

    await expect(getMongoDb()).rejects.toBeInstanceOf(DatabaseConfigurationError);
    await expect(getMongoDb()).rejects.toMatchObject({ variable, message: `Missing ${variable} environment variable.` });
    expect(connect).not.toHaveBeenCalled();
  });

  it("preserves the original driver error and allows retry after a failed cached connection", async () => {
    vi.resetModules();
    const { MongoClient, MongoNetworkError } = await import("mongodb");
    const { getMongoClient } = await import("@/lib/mongodb");
    vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017");
    const client = new MongoClient("mongodb://localhost:27017");
    const error = new MongoNetworkError("connection unavailable");
    const connect = vi.spyOn(MongoClient.prototype, "connect")
      .mockRejectedValueOnce(error).mockResolvedValue(client);

    await expect(getMongoClient()).rejects.toBe(error);
    await expect(getMongoClient()).resolves.toBe(client);
    await expect(getMongoClient()).resolves.toBe(client);
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
