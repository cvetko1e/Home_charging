import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardPage from "@/app/admin/(protected)/dashboard/page";
import { getAdminAssessmentList, getAdminDashboardStats } from "@/services/adminAssessments";
import type { AdminAssessmentListItem, AdminDashboardStats } from "@/types/admin";
import { AssessmentFilters } from "../AssessmentFilters";
import { AssessmentsTable } from "../AssessmentsTable";
import { PaginationLink } from "../PaginationLink";
import { StatisticCard } from "../StatisticCard";
import { StatusBadge } from "../StatusBadge";

vi.mock("@/services/adminAssessments", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/adminAssessments")>(),
  getAdminAssessmentList: vi.fn(),
  getAdminDashboardStats: vi.fn(),
}));
vi.mock("@/services/adminSession", () => ({
  requireAdminSession: () => { throw new Error("Page protection belongs to the layout."); },
}));

const assessment: AdminAssessmentListItem = {
  id: "507f1f77bcf86cd799439011", status: "completed", lastCompletedStep: 7,
  customerName: "Avery Stone", customerEmail: "avery@example.com", vehicle: "2024 Tesla Model 3",
  vehicleManufacturer: "Tesla", vehicleModel: "Model 3",
  createdAt: "2026-01-15T12:00:00.000Z", updatedAt: "2026-07-15T12:00:00.000Z",
  lastActivityAt: "2026-07-15T12:00:00.000Z", completedAt: "2026-07-15T12:00:00.000Z",
};
const stats: AdminDashboardStats = {
  totalAssessments: 50, completedAssessments: 26, draftAssessments: 24, completionPercentage: 52,
  inactiveDraftAssessments: 10, inactiveDraftThresholdDays: 7,
  dropOffs: [{ step: 2, label: "Stopped after vehicle details", count: 4 }],
  recentlySubmittedAssessments: [assessment],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminDashboardStats).mockResolvedValue(stats);
  vi.mocked(getAdminAssessmentList).mockResolvedValue({
    assessments: [assessment], page: 2, pageSize: 25, total: 50, totalPages: 2,
  });
});

describe("server dashboard components", () => {
  it("preserves all filter controls, selected values and the GET form action", () => {
    const query = new URLSearchParams({
      search: "Avery", status: "completed", createdFrom: "2026-09-01", createdTo: "2026-09-15",
      lastCompletedStep: "0", customerName: "Stone", email: "avery@example.com",
      vehicleManufacturer: "Tesla", vehicleModel: "Model 3", chargerPurchase: "no",
      sort: "createdAt", direction: "asc", pageSize: "25", page: "4",
    });
    const html = renderToStaticMarkup(<AssessmentFilters query={query} />);
    expect(html).toContain('action="/admin/dashboard"');
    expect(html).not.toContain('method="post"');
    expect(html).not.toContain('name="page"');
    const selectNames = ["status", "lastCompletedStep", "chargerPurchase", "sort", "direction", "pageSize"];
    for (const [name, value] of query) {
      if (name === "page") continue;
      if (selectNames.includes(name)) {
        const select = html.match(new RegExp(`<select[^>]*name="${name}"[^>]*>([\\s\\S]*?)</select>`))?.[1];
        const selected = select?.match(/<option[^>]*selected=""[^>]*>/)?.[0];
        expect(selected).toContain(`value="${value}"`);
      } else {
        const input = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0];
        expect(input).toContain(`value="${value}"`);
      }
    }
    for (const sort of ["lastActivityAt", "createdAt", "status", "lastCompletedStep", "customerName", "vehicle"]) {
      expect(html).toContain(`value="${sort}"`);
    }
    expect(html).toContain("Apply filters");
    expect(html).toContain("Reset");
    expect(html).toContain("lg:grid-cols-4");
  });

  it("retains table data, accessible headers, detail links and Belgrade timestamps", () => {
    const html = renderToStaticMarkup(<AssessmentsTable
      assessments={[assessment]} page={2} pageSize={10} total={30} totalPages={3}
      query={new URLSearchParams("search=Avery&sort=createdAt&direction=asc&page=2")}
    />);
    for (const value of [assessment.customerName, assessment.customerEmail, assessment.vehicle, "Completed"]) {
      expect(html).toContain(value);
    }
    expect(html).toContain(`href="/admin/assessments/${assessment.id}"`);
    expect(html).toContain("Jan 15, 2026, 1:00 PM");
    expect(html).toContain("Jul 15, 2026, 2:00 PM");
    expect(html.match(/scope="col"/g)).toHaveLength(7);
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("Showing page 2 of 3 (30 total,10 per page)");
    expect(html).toContain('href="/admin/dashboard?search=Avery&amp;sort=createdAt&amp;direction=asc&amp;page=1"');
    expect(html).toContain('href="/admin/dashboard?search=Avery&amp;sort=createdAt&amp;direction=asc&amp;page=3"');
  });

  it("retains the empty table and disables pagination at its boundaries", () => {
    const html = renderToStaticMarkup(<AssessmentsTable
      assessments={[]} page={1} pageSize={10} total={0} totalPages={1} query={new URLSearchParams()}
    />);
    expect(html).toContain("No assessments match the current filters.");
    expect(html).toContain('colSpan="7"');
    expect(html).not.toContain("href=");
    expect(html).toContain("Previous");
    expect(html).toContain("Next");
  });

  it("renders disabled pagination as text and enabled pagination as a link", () => {
    expect(renderToStaticMarkup(<PaginationLink href="/admin/dashboard?page=2" disabled={false}>Next</PaginationLink>))
      .toContain('href="/admin/dashboard?page=2"');
    const disabled = renderToStaticMarkup(<PaginationLink href="/admin/dashboard?page=0" disabled>Previous</PaginationLink>);
    expect(disabled).toMatch(/^<span/);
    expect(disabled).not.toContain("href=");
  });

  it("preserves statistic and status presentation", () => {
    expect(renderToStaticMarkup(<StatisticCard label="Completion" value="52%" />)).toContain("52%");
    const completed = renderToStaticMarkup(<StatusBadge status="completed" />);
    const draft = renderToStaticMarkup(<StatusBadge status="draft" />);
    expect(completed).toContain("Completed");
    expect(completed).toContain("bg-emerald-100");
    expect(draft).toContain("Draft");
    expect(draft).toContain("bg-amber-100");
  });
});

describe("server dashboard page", () => {
  it("loads statistics and filtered assessments in the page and renders recent submissions", async () => {
    const page = await AdminDashboardPage({ searchParams: Promise.resolve({
      search: "Avery", page: "2", pageSize: "25", sort: "createdAt", direction: "asc", status: "completed",
    }) });
    expect(getAdminDashboardStats).toHaveBeenCalledOnce();
    expect(getAdminAssessmentList).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      search: "Avery", page: 2, pageSize: 25, sort: "createdAt", direction: "asc", status: "completed",
    }));
    const html = renderToStaticMarkup(page);
    for (const text of ["Admin Dashboard", "Total assessments", "52%", "Inactive drafts (7d)",
      "Stopped after vehicle details", "Recently submitted", "Submitted Jul 15, 2026, 2:00 PM", "Clear filters"]) {
      expect(html).toContain(text);
    }
  });

  it("keeps the recent-submissions empty state and default query parsing", async () => {
    vi.mocked(getAdminDashboardStats).mockResolvedValue({ ...stats, recentlySubmittedAssessments: [] });
    const html = renderToStaticMarkup(await AdminDashboardPage({}));
    expect(html).toContain("No completed assessments are available yet.");
    expect(getAdminAssessmentList).toHaveBeenCalledWith(expect.objectContaining({
      page: 1, pageSize: 10, sort: "lastActivityAt", direction: "desc",
    }));
  });
});
