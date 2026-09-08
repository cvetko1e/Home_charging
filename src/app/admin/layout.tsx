import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-300">
              Admin portal
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              Home Charging Assessment
            </h1>
          </div>
          <nav aria-label="Admin navigation" className="flex gap-3 text-sm">
            <Link
              href="/admin/login"
              className="rounded-md border border-white/15 px-3 py-2 font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              Login
            </Link>
            <Link
              href="/admin/dashboard"
              className="rounded-md border border-white/15 px-3 py-2 font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              Dashboard
            </Link>
          </nav>
        </header>
        <div className="flex-1 py-8">{children}</div>
      </div>
    </main>
  );
}
