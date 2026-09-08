import Link from "next/link";
import {
  getAdminAssessmentList,
  getAdminDashboardStats,
  parseAssessmentListSearchParams,
} from "@/services/adminAssessments";
import { requireAdminSession } from "@/services/adminSession";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDashboardPage({
  searchParams,
}: DashboardPageProps) {
  await requireAdminSession();

  const rawSearchParams = await searchParams;
  const urlSearchParams = toUrlSearchParams(rawSearchParams);
  const query = parseAssessmentListSearchParams(urlSearchParams);
  const [stats, list] = await Promise.all([
    getAdminDashboardStats(),
    getAdminAssessmentList(query),
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

function StatisticCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-neutral-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

function AssessmentFilters({ query }: { query: URLSearchParams }) {
  return (
    <form
      action="/admin/dashboard"
      className="grid gap-4 border-b border-neutral-200 bg-neutral-50 px-5 py-4"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FilterInput label="Search" name="search" query={query} />
        <FilterSelect label="Status" name="status" query={query}>
          <option value="">Any status</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
        </FilterSelect>
        <FilterInput label="Created from" name="createdFrom" type="date" query={query} />
        <FilterInput label="Created to" name="createdTo" type="date" query={query} />
        <FilterSelect label="Last completed step" name="lastCompletedStep" query={query}>
          <option value="">Any step</option>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((step) => (
            <option key={step} value={step}>
              {step}
            </option>
          ))}
        </FilterSelect>
        <FilterInput label="Customer name" name="customerName" query={query} />
        <FilterInput label="Email" name="email" type="email" query={query} />
        <FilterInput
          label="Vehicle manufacturer"
          name="vehicleManufacturer"
          query={query}
        />
        <FilterInput label="Vehicle model" name="vehicleModel" query={query} />
        <FilterSelect label="Charger purchase" name="chargerPurchase" query={query}>
          <option value="">Any choice</option>
          <option value="yes">Wants charger</option>
          <option value="no">Does not want charger</option>
        </FilterSelect>
        <FilterSelect label="Sort by" name="sort" query={query}>
          <option value="lastActivityAt">Last activity</option>
          <option value="createdAt">Created date</option>
          <option value="status">Status</option>
          <option value="lastCompletedStep">Last completed step</option>
          <option value="customerName">Customer name</option>
          <option value="vehicle">Vehicle</option>
        </FilterSelect>
        <FilterSelect label="Direction" name="direction" query={query}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </FilterSelect>
        <FilterSelect label="Page size" name="pageSize" query={query}>
          {[10, 25, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize}
            </option>
          ))}
        </FilterSelect>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
        >
          Apply filters
        </button>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:ring-offset-2"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}

function AssessmentsTable({
  assessments,
  page,
  pageSize,
  query,
  total,
  totalPages,
}: {
  assessments: Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    vehicle: string;
    status: string;
    lastCompletedStep: number;
    createdAt: string;
    lastActivityAt: string;
  }>;
  page: number;
  pageSize: number;
  query: URLSearchParams;
  total: number;
  totalPages: number;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-white text-neutral-600">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">
                Customer
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Vehicle
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Last step
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Created
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Last activity
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {assessments.length > 0 ? (
              assessments.map((assessment) => (
                <tr key={assessment.id}>
                  <td className="px-5 py-4 align-top">
                    <span className="block font-semibold text-neutral-950">
                      {assessment.customerName}
                    </span>
                    <span className="mt-1 block text-neutral-600">
                      {assessment.customerEmail}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top">{assessment.vehicle}</td>
                  <td className="px-5 py-4 align-top">
                    <StatusBadge status={assessment.status} />
                  </td>
                  <td className="px-5 py-4 align-top">
                    {assessment.lastCompletedStep}
                  </td>
                  <td className="px-5 py-4 align-top">
                    {formatDateTime(assessment.createdAt)}
                  </td>
                  <td className="px-5 py-4 align-top">
                    {formatDateTime(assessment.lastActivityAt)}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={`/admin/assessments/${assessment.id}`}
                      className="font-semibold text-emerald-800 hover:text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-neutral-500"
                >
                  No assessments match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-200 px-5 py-4 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing page {page} of {totalPages} ({total.toLocaleString()} total,
          {pageSize} per page)
        </p>
        <div className="flex gap-2">
          <PaginationLink
            disabled={page <= 1}
            href={createPageHref(query, page - 1)}
          >
            Previous
          </PaginationLink>
          <PaginationLink
            disabled={page >= totalPages}
            href={createPageHref(query, page + 1)}
          >
            Next
          </PaginationLink>
        </div>
      </div>
    </div>
  );
}

function FilterInput({
  label,
  name,
  query,
  type = "text",
}: {
  label: string;
  name: string;
  query: URLSearchParams;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={query.get(name) ?? ""}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function FilterSelect({
  children,
  label,
  name,
  query,
}: {
  children: React.ReactNode;
  label: string;
  name: string;
  query: URLSearchParams;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <select
        name={name}
        defaultValue={query.get(name) ?? undefined}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
      >
        {children}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status === "completed";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isCompleted
          ? "bg-emerald-100 text-emerald-900"
          : "bg-amber-100 text-amber-900"
      }`}
    >
      {isCompleted ? "Completed" : "Draft"}
    </span>
  );
}

function PaginationLink({
  children,
  disabled,
  href,
}: {
  children: React.ReactNode;
  disabled: boolean;
  href: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-neutral-200 px-3 py-2 text-neutral-400">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-md border border-neutral-300 px-3 py-2 font-semibold text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600"
    >
      {children}
    </Link>
  );
}

function toUrlSearchParams(
  searchParams?: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }

  return params;
}

function createPageHref(query: URLSearchParams, page: number) {
  const params = new URLSearchParams(query);
  params.set("page", String(page));

  return `/admin/dashboard?${params.toString()}`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
