export default function AdminLoginPage() {
  return (
    <section className="mx-auto max-w-md rounded-lg border border-white/10 bg-white p-6 text-neutral-950 shadow-sm">
      <p className="text-sm font-semibold uppercase text-emerald-700">
        Admin access
      </p>
      <h2 className="mt-3 text-3xl font-semibold">Admin Login</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-700">
        Authentication is not implemented yet. This page is only the visual
        starting point for the future admin portal.
      </p>
      <form className="mt-6 grid gap-4" aria-describedby="admin-login-status">
        <label className="block">
          <span className="text-sm font-semibold text-neutral-900">Email</span>
          <input
            type="email"
            disabled
            className="mt-2 w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
            placeholder="admin@example.com"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-neutral-900">
            Password
          </span>
          <input
            type="password"
            disabled
            className="mt-2 w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
            placeholder="Not available yet"
          />
        </label>
        <p
          id="admin-login-status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Login will be connected during the next implementation phase.
        </p>
        <button
          type="button"
          disabled
          className="rounded-md bg-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600"
        >
          Login Not Available
        </button>
      </form>
    </section>
  );
}
