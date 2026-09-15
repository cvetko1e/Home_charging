import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { createPageHref } from "@/lib/admin-dashboard-query";
import type { AdminAssessmentListItem } from "@/types/admin";
import { PaginationLink } from "./PaginationLink";
import { StatusBadge } from "./StatusBadge";

export function AssessmentsTable({
  assessments,
  page,
  pageSize,
  query,
  total,
  totalPages,
}: {
  assessments: AdminAssessmentListItem[];
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
