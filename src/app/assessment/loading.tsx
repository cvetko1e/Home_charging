export default function AssessmentLoading() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10 text-neutral-950">
      <section
        role="status"
        aria-live="polite"
        className="mx-auto mt-20 max-w-xl rounded-lg border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <p className="text-sm font-semibold uppercase text-emerald-700">
          Home Charging Assessment
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
          Preparing your assessment…
        </h1>
        <p className="mt-4 text-base leading-7 text-neutral-700">
          Please wait while the assessment loads.
        </p>
      </section>
    </main>
  );
}
