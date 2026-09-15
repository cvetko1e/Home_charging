import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardPage from "@/app/admin/(protected)/dashboard/page";
import AssessmentDetailPage from "@/app/admin/(protected)/assessments/[assessmentId]/page";
import { getAdminAssessmentDetail, getAdminAssessmentList, getAdminDashboardStats } from "@/services/adminAssessments";
import { failure } from "@/lib/result";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/services/adminAssessments", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/adminAssessments")>(),
  getAdminAssessmentDetail: vi.fn(), getAdminAssessmentList: vi.fn(), getAdminDashboardStats: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe("admin page result handling", () => {
  it("renders the existing assessment error panel for a missing assessment without throwing", async () => {
    vi.mocked(getAdminAssessmentDetail).mockResolvedValue(failure("NOT_FOUND", "Assessment was not found."));
    const html = renderToStaticMarkup(await AssessmentDetailPage({ params: Promise.resolve({ assessmentId: "507f1f77bcf86cd799439011" }) }));
    expect(html).toContain("Assessment unavailable");
    expect(html).toContain("Assessment was not found.");
    expect(html).toContain("Try again");
    expect(html).toContain("Back to dashboard");
  });

  it("renders the existing dashboard error panel for invalid query parameters without fetching data", async () => {
    const html = renderToStaticMarkup(await AdminDashboardPage({ searchParams: Promise.resolve({ page: "0" }) }));
    expect(html).toContain("Dashboard unavailable");
    expect(html).toContain("Validation failed.");
    expect(html).toContain("Try again");
    expect(getAdminAssessmentList).not.toHaveBeenCalled();
    expect(getAdminDashboardStats).not.toHaveBeenCalled();
  });
});
