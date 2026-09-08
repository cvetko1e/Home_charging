import { describe, expect, it } from "vitest";
import {
  calculateCompletionPercentage,
  normalizeDropOffStats,
  parseAssessmentListSearchParams,
} from "@/services/adminAssessments";
import { adminAssessmentUpdateSchema } from "@/validation/admin";

describe("admin assessment helpers", () => {
  it("parses assessment filters with pagination and sorting", () => {
    const params = new URLSearchParams({
      page: "2",
      pageSize: "25",
      sort: "customerName",
      direction: "asc",
      status: "draft",
      customerName: "Taylor",
      chargerPurchase: "yes",
      lastCompletedStep: "4",
    });
    const result = parseAssessmentListSearchParams(params);

    expect(result).toMatchObject({
      page: 2,
      pageSize: 25,
      sort: "customerName",
      direction: "asc",
      status: "draft",
      customerName: "Taylor",
      chargerPurchase: "yes",
      lastCompletedStep: 4,
    });
  });

  it("enforces the admin update whitelist", () => {
    const validUpdate = adminAssessmentUpdateSchema.parse({
      firstName: "Avery",
      email: "AVERY@example.com",
      adminNotes: "Called customer.",
    });

    expect(validUpdate.email).toBe("avery@example.com");
    expect(() =>
      adminAssessmentUpdateSchema.parse({
        resumeTokenHash: "not allowed",
      }),
    ).toThrow();
  });

  it("normalizes draft-only drop-off statistics", () => {
    expect(
      normalizeDropOffStats([
        { step: 0, count: 1 },
        { step: 2, count: 4 },
        { step: 7, count: 99 },
      ]),
    ).toEqual([
      { step: 0, label: "Started without saving step one", count: 1 },
      { step: 1, label: "Stopped after personal details", count: 0 },
      { step: 2, label: "Stopped after vehicle details", count: 4 },
      { step: 3, label: "Stopped after electrical panel", count: 0 },
      { step: 4, label: "Stopped after installation details", count: 0 },
      { step: 5, label: "Stopped after home information", count: 0 },
      { step: 6, label: "Stopped after EV charger selection", count: 0 },
    ]);
  });

  it("calculates completed assessment percentage", () => {
    expect(calculateCompletionPercentage(0, 0)).toBe(0);
    expect(calculateCompletionPercentage(10, 4)).toBe(40);
    expect(calculateCompletionPercentage(3, 2)).toBe(67);
  });
});
