"use client";

import { useRouter } from "next/navigation";

export default function AdminDashboardError({
  error,
  reset,
  message,
}: {
  error?: Error;
  reset?: () => void;
  message?: string;
}) {
  const router = useRouter();
  return (
    <section className="rounded-md border border-red-300 bg-red-50 p-6 text-red-950">
      <h2 className="text-xl font-semibold">Dashboard unavailable</h2>
      <p className="mt-2 text-sm leading-6">
        {message || error?.message || "The dashboard data could not be loaded."}
      </p>
      <button
        type="button"
        onClick={reset ?? (() => router.refresh())}
        className="mt-5 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
      >
        Try again
      </button>
    </section>
  );
}
