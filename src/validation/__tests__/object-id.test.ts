import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { getMongoDb } from "@/lib/mongodb";
import { getAdminAssessmentDetail, updateAdminAssessment } from "@/services/adminAssessments";
import { getAuthorizedAssessment } from "@/services/assessments";
import { validateObjectId } from "@/validation/object-id";

vi.mock("@/lib/mongodb", () => ({ getMongoDb: vi.fn() }));

describe("shared ObjectId validation", () => {
  it.each([
    "507f1f77bcf86cd799439011",
    "507F1F77BCF86CD799439011",
    "000000000000000000000000",
    "ffffffffffffffffffffffff",
  ])("accepts a valid hexadecimal ID: %s", (id) => {
    expect(ObjectId.isValid(id)).toBe(true);
    expect(validateObjectId(id)).toEqual({ success: true, data: undefined });
  });

  it.each([
    "", "not-an-id", "abcdefghijkl", "g".repeat(24), "a".repeat(23), "a".repeat(25),
    " 507f1f77bcf86cd799439011", "507f1f77bcf86cd799439011 ",
    "507f1f77bcf86cd799439011\n", "507f1f77bcf86cd799439011\r\n",
    "５０７f1f77bcf86cd799439011",
  ])("preserves the driver's string validation and controlled 400 error: %j", (id) => {
    expect(ObjectId.isValid(id)).toBe(false);
    expect(validateObjectId(id)).toMatchObject({ success: false, error: {
      code: "INVALID_REQUEST", message: "A valid assessment id is required.",
    } });
  });

  it.each([
    ["admin detail", () => getAdminAssessmentDetail("invalid")],
    ["admin update", () => updateAdminAssessment("invalid", { adminNotes: "Reviewed" })],
    ["customer resume", () => getAuthorizedAssessment("invalid", "unused-token")],
  ] as const)("rejects invalid IDs before database access for %s", async (_label, operation) => {
    await expect(operation()).resolves.toMatchObject({ success: false, error: {
      code: "INVALID_REQUEST", message: "A valid assessment id is required.",
    } });
    expect(getMongoDb).not.toHaveBeenCalled();
  });
});
