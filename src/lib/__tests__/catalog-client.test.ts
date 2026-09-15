import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadChargerCatalog, loadVehicleCatalog } from "@/lib/catalog-client";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe.each([
  { name: "vehicles", load: loadVehicleCatalog, payload: { vehicles: [{ manufacturer: "Fresh", models: [{ name: "One", years: [2030] }] }] } },
  { name: "chargers", load: loadChargerCatalog, payload: { chargers: [{ brand: "Fresh", models: ["One"] }] } },
])("catalog client: $name", ({ name, load, payload }) => {
  it("requests its endpoint without credentials and uses only validated public data", async () => {
    fetchMock.mockResolvedValue(Response.json(payload));
    const signal = new AbortController().signal;
    await expect(load(signal)).resolves.toEqual({ success: true, data: payload });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/api/${name}`, { credentials: "omit", signal });
  });

  it.each(["offline", "http error", "invalid JSON", "empty catalog", "wrong shape"])("returns a safe unavailable result for %s", async (state) => {
    if (state === "offline") fetchMock.mockRejectedValue(new Error("private network details"));
    if (state === "http error") fetchMock.mockResolvedValue(Response.json({ error: { message: "private details" } }, { status: 503 }));
    if (state === "invalid JSON") fetchMock.mockResolvedValue(new Response("<html>failure</html>"));
    if (state === "empty catalog") fetchMock.mockResolvedValue(Response.json({ [name]: [] }));
    if (state === "wrong shape") fetchMock.mockResolvedValue(Response.json({ [name]: [{ models: "invalid" }] }));
    await expect(load()).resolves.toMatchObject({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: `${name === "vehicles" ? "Vehicle" : "Charger"} catalog is unavailable. Please try again.` } });
  });
});
