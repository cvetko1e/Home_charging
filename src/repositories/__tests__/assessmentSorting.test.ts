import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAssessmentIndexes,
  listAssessmentsForAdmin,
  type AssessmentAdminSortField,
} from "@/repositories/assessments";

const collectionMock = vi.hoisted(() => ({
  createIndexes: vi.fn(),
  find: vi.fn(),
  countDocuments: vi.fn(),
  sort: vi.fn(),
  skip: vi.fn(),
  limit: vi.fn(),
  toArray: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  getMongoDb: vi.fn(async () => ({ collection: () => collectionMock })),
}));

const otherSortFields: Array<[AssessmentAdminSortField, string[]]> = [
  ["lastActivityAt", ["lastActivityAt"]],
  ["status", ["status"]],
  ["lastCompletedStep", ["lastCompletedStep"]],
  ["customerName", ["sections.personalDetails.lastName", "sections.personalDetails.firstName"]],
  ["vehicle", ["sections.vehicleDetails.manufacturer", "sections.vehicleDetails.model"]],
];

describe("admin assessment sorting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of ["find", "sort", "skip", "limit"] as const) {
      collectionMock[method].mockReturnValue(collectionMock);
    }
    collectionMock.countDocuments.mockResolvedValue(0);
    collectionMock.toArray.mockResolvedValue([]);
  });

  it.each([
    ["asc", 1, [1, 3, 2, 4]],
    ["desc", -1, [4, 3, 2, 1]],
  ] as const)("sorts createdAt %s with a stable tie-breaker", async (direction, value, expectedIds) => {
    await listAssessmentsForAdmin({
      page: 1, pageSize: 25, sort: "createdAt", direction, filters: {},
    });

    const sort = collectionMock.sort.mock.calls[0][0] as Record<string, 1 | -1>;
    expect(Object.entries(sort)).toEqual([["createdAt", value], ["_id", -1]]);

    const rows = [
      { _id: 2, createdAt: new Date("2026-09-02T12:00:00Z") },
      { _id: 4, createdAt: new Date("2026-09-03T12:00:00Z") },
      { _id: 1, createdAt: new Date("2026-09-01T12:00:00Z") },
      { _id: 3, createdAt: new Date("2026-09-02T12:00:00Z") },
    ].map((row) => ({
      _id: new ObjectId(row._id.toString(16).padStart(24, "0")).toHexString(),
      createdAt: row.createdAt.getTime(),
    }));

    // Apply the ordered MongoDB sort keys to deliberately unordered fixtures.
    rows.sort((left, right) => {
      for (const [field, order] of Object.entries(sort)) {
        const key = field as keyof typeof left;
        if (left[key] < right[key]) return -order;
        if (left[key] > right[key]) return order;
      }
      return 0;
    });

    expect(rows.map((row) => Number.parseInt(row._id, 16))).toEqual(expectedIds);
  });

  describe.each(["asc", "desc"] as const)("other sort fields (%s)", (direction) => {
    it.each(otherSortFields)("preserves %s primary keys and secondary sorting", async (sort, fields) => {
      await listAssessmentsForAdmin({
        page: 1, pageSize: 25, sort, direction, filters: {},
      });

      expect(Object.entries(collectionMock.sort.mock.calls[0][0])).toEqual([
        ...fields.map((field) => [field, direction === "asc" ? 1 : -1]),
        ["createdAt", -1],
        ["_id", -1],
      ]);
    });
  });

  it("creates a unique sparse seed ID index, allowing records without a seed ID", async () => {
    await createAssessmentIndexes();

    expect(collectionMock.createIndexes).toHaveBeenCalledWith(
      expect.arrayContaining([{ key: { seedId: 1 }, unique: true, sparse: true }]),
    );
  });
});
