"use client";

import Link from "next/link";

export default function AssessmentDetailError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="rounded-md border border-red-300 bg-red-50 p-6 text-red-950">
      <h2 className="text-xl font-semibold">Assessment unavailable</h2>
      <p className="mt-2 text-sm leading-6">
        {error.message || "The assessment could not be loaded."}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
        >
          Try again
        </button>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-950 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
