import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import {
  getAdminAssessmentList,
  getAdminDashboardStats,
  parseAssessmentListSearchParams,
} from "@/services/adminAssessments";
import { StatisticCard } from "@/components/admin/StatisticCard";
import { AssessmentFilters } from "@/components/admin/AssessmentFilters";
import { AssessmentsTable } from "@/components/admin/AssessmentsTable";
import { toUrlSearchParams } from "@/lib/admin-dashboard-query";
import AdminDashboardError from "./error";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDashboardPage({
  searchParams,
}: DashboardPageProps) {
  const rawSearchParams = await searchParams;
  const urlSearchParams = toUrlSearchParams(rawSearchParams);
  const query = parseAssessmentListSearchParams(urlSearchParams);
  if (!query.success) {
    return <AdminDashboardError message={query.error.message} />;
  }
  const [stats, list] = await Promise.all([
    getAdminDashboardStats(),
    getAdminAssessmentList(query.data),
  ]);

  return (
    <section className="grid gap-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-300">
            Overview
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Admin Dashboard</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-300">
            Review incoming charger installation assessments, monitor draft
            activity, and update whitelisted customer fields.
          </p>
        </div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center justify-center rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          Clear filters
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatisticCard
          label="Total assessments"
          value={stats.totalAssessments.toLocaleString()}
        />
        <StatisticCard
          label="Completed"
          value={stats.completedAssessments.toLocaleString()}
        />
        <StatisticCard
          label="Drafts"
          value={stats.draftAssessments.toLocaleString()}
        />
        <StatisticCard
          label="Completion"
          value={`${stats.completionPercentage}%`}
        />
        <StatisticCard
          label={`Inactive drafts (${stats.inactiveDraftThresholdDays}d)`}
          value={stats.inactiveDraftAssessments.toLocaleString()}
        />
      </div>

      <section className="grid gap-4 rounded-md border border-white/10 bg-white/5 p-5">
        <div>
          <h3 className="text-lg font-semibold">Draft drop-off</h3>
          <p className="mt-1 text-sm text-neutral-300">
            Draft-only counts by the last survey step saved.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {stats.dropOffs.map((dropOff) => (
            <div
              key={dropOff.step}
              className="rounded-md border border-white/10 bg-neutral-900 px-4 py-3"
            >
              <p className="text-sm text-neutral-300">{dropOff.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {dropOff.count.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-white/10 bg-white text-neutral-950">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h3 className="text-lg font-semibold">Assessments</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Server-side search, filtering, sorting and pagination.
          </p>
        </div>
        <AssessmentFilters query={urlSearchParams} />
        <AssessmentsTable
          assessments={list.assessments}
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          totalPages={list.totalPages}
          query={urlSearchParams}
        />
      </section>

      <section className="rounded-md border border-white/10 bg-white/5 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Recently submitted</h3>
          <p className="mt-1 text-sm text-neutral-300">
            Latest completed assessments ready for review.
          </p>
        </div>
        {stats.recentlySubmittedAssessments.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {stats.recentlySubmittedAssessments.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/admin/assessments/${assessment.id}`}
                className="rounded-md border border-white/10 bg-neutral-900 p-4 text-sm hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <span className="block font-semibold text-white">
                  {assessment.customerName}
                </span>
                <span className="mt-1 block text-neutral-300">
                  {assessment.vehicle}
                </span>
                <span className="mt-2 block text-xs text-neutral-400">
                  Submitted {formatDateTime(assessment.completedAt)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-white/10 bg-neutral-900 px-4 py-6 text-sm text-neutral-300">
            No completed assessments are available yet.
          </p>
        )}
      </section>
    </section>
  );
}
