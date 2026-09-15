import { describe, expect, it } from "vitest";
import { createPageHref, toUrlSearchParams } from "@/lib/admin-dashboard-query";

describe("admin dashboard query helpers", () => {
  it("preserves repeated values, empty strings and their order while omitting undefined", () => {
    expect([...toUrlSearchParams({
      search: "Avery & Jamie", status: ["draft", "completed"], email: "", page: "3", absent: undefined,
    })]).toEqual([
      ["search", "Avery & Jamie"], ["status", "draft"], ["status", "completed"], ["email", ""], ["page", "3"],
    ]);
    expect([...toUrlSearchParams()]).toEqual([]);
  });

  it("changes only the page while retaining every filter, sort option and unknown parameter", () => {
    const query = new URLSearchParams({
      search: "Avery & Jamie", status: "draft", createdFrom: "2026-09-01", createdTo: "2026-09-15",
      lastCompletedStep: "0", customerName: "Avery", email: "avery+home@example.com",
      vehicleManufacturer: "Tesla", vehicleModel: "Model 3", chargerPurchase: "no",
      sort: "createdAt", direction: "asc", pageSize: "25", page: "3", extra: "keep me",
    });
    query.append("extra", "keep this too");
    const original = query.toString();
    const url = new URL(createPageHref(query, 4), "http://localhost");

    expect(url.pathname).toBe("/admin/dashboard");
    expect(url.searchParams.get("page")).toBe("4");
    for (const key of new Set(query.keys())) {
      if (key !== "page") expect(url.searchParams.getAll(key)).toEqual(query.getAll(key));
    }
    expect(query.toString()).toBe(original);
  });

  it("replaces duplicate page parameters without changing other repeated parameters", () => {
    const query = new URLSearchParams("page=2&page=3&status=draft&status=completed");
    expect(createPageHref(query, 1)).toBe("/admin/dashboard?page=1&status=draft&status=completed");
    expect(createPageHref(new URLSearchParams(), 2)).toBe("/admin/dashboard?page=2");
  });
});
