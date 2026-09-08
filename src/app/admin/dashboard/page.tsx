const statisticCards = [
  { label: "Total assessments", value: "0" },
  { label: "Completed requests", value: "0" },
  { label: "Draft requests", value: "0" },
  { label: "Drop-off tracking", value: "Pending" },
];

export default function AdminDashboardPage() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-emerald-300">
          Overview
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Admin Dashboard</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-300">
          Assessment loading, authentication, filtering and statistics are not
          implemented yet. This route provides the initial visual structure for
          the second-day admin work.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statisticCards.map((card) => (
          <article
            key={card.label}
            className="rounded-lg border border-white/10 bg-white/5 p-5"
          >
            <p className="text-sm text-neutral-300">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {card.value}
            </p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-white text-neutral-950">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h3 className="text-lg font-semibold">Assessments</h3>
          <p className="mt-1 text-sm text-neutral-600">
            The table layout is ready for future data loading.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
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
                  Last activity
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-neutral-500">
                  No assessment data is loaded yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
