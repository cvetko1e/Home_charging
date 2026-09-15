import { describe, expect, it } from "vitest";
import { formatAssessmentStatus, formatMajorAppliances, isEmptyValue } from "@/lib/assessment-display";
import { majorApplianceOptions } from "@/lib/catalogs";

describe("shared assessment display helpers", () => {
  it("keeps the same status labels in the table and detail page", () => {
    expect(formatAssessmentStatus("completed")).toBe("Completed");
    expect(formatAssessmentStatus("draft")).toBe("Draft");
  });

  it("keeps appliance labels and ordering consistent with the catalog", () => {
    expect(formatMajorAppliances(majorApplianceOptions.map(({ value }) => value))).toBe(
      majorApplianceOptions.map(({ label }) => label).join(", "),
    );
  });

  it("preserves unknown appliance values and the empty result", () => {
    expect(formatMajorAppliances(["unlisted appliance"])).toBe("unlisted appliance");
    expect(formatMajorAppliances()).toBe("");
    expect(formatMajorAppliances([])).toBe("");
  });

  it.each([undefined, null, ""])("marks %s as missing", (value) => {
    expect(isEmptyValue(value)).toBe(true);
  });

  it.each([0, false, " ", "No", 200])("preserves display value %s", (value) => {
    expect(isEmptyValue(value)).toBe(false);
  });
});
