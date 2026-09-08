import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getCurrentAdminSession } from "@/services/adminSession";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return <AdminLoginPageContent />;
}

async function AdminLoginPageContent() {
  const session = await getCurrentAdminSession();

  if (session) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          Home
        </Link>
      </div>
      <section className="mx-auto w-full max-w-md rounded-lg border border-white/10 bg-white p-6 text-neutral-950 shadow-sm">
        <p className="text-sm font-semibold uppercase text-emerald-700">
          Admin access
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Admin Login</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-700">
          Sign in with a seeded development administrator or a database-backed
          admin account.
        </p>
        <AdminLoginForm />
      </section>
    </div>
  );
}
