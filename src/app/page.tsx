import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase text-emerald-700">
          EV charging intake
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold sm:text-6xl">
          Home Charging Assessment
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-700">
          Start a guided installation request for an electric vehicle home
          charger. Customers can begin the assessment without creating an
          account and return later with a secure resume link.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/assessment"
            className="inline-flex items-center justify-center rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
          >
            Start Assessment
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:ring-offset-2"
          >
            Admin Login
          </Link>
        </div>
      </section>
    </main>
  );
}
