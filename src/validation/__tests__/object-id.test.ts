import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { getMongoDb } from "@/lib/mongodb";
import { getAdminAssessmentDetail, updateAdminAssessment } from "@/services/adminAssessments";
import { getAuthorizedAssessment } from "@/services/assessments";
import { AssessmentServiceError } from "@/services/errors";
import { assertValidObjectId } from "@/validation/object-id";

vi.mock("@/lib/mongodb", () => ({ getMongoDb: vi.fn() }));

describe("shared ObjectId assertion", () => {
  it.each([
    "507f1f77bcf86cd799439011",
    "507F1F77BCF86CD799439011",
    "000000000000000000000000",
    "ffffffffffffffffffffffff",
  ])("accepts a valid hexadecimal ID: %s", (id) => {
    expect(ObjectId.isValid(id)).toBe(true);
    expect(() => assertValidObjectId(id)).not.toThrow();
  });

  it.each([
    "", "not-an-id", "abcdefghijkl", "g".repeat(24), "a".repeat(23), "a".repeat(25),
    " 507f1f77bcf86cd799439011", "507f1f77bcf86cd799439011 ",
    "507f1f77bcf86cd799439011\n", "507f1f77bcf86cd799439011\r\n",
    "５０７f1f77bcf86cd799439011",
  ])("preserves the driver's string validation and controlled 400 error: %j", (id) => {
    expect(ObjectId.isValid(id)).toBe(false);
    expect(() => assertValidObjectId(id)).toThrow(AssessmentServiceError);
    expect(() => assertValidObjectId(id)).toThrow(expect.objectContaining({
      status: 400, message: "A valid assessment id is required.",
    }));
  });

  it.each([
    ["admin detail", () => getAdminAssessmentDetail("invalid")],
    ["admin update", () => updateAdminAssessment("invalid", { adminNotes: "Reviewed" })],
    ["customer resume", () => getAuthorizedAssessment("invalid", "unused-token")],
  ] as const)("rejects invalid IDs before database access for %s", async (_label, operation) => {
    await expect(operation()).rejects.toMatchObject({
      status: 400, message: "A valid assessment id is required.",
    });
    expect(getMongoDb).not.toHaveBeenCalled();
  });
});
