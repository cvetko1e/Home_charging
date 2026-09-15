import Link from "next/link";

export function AssessmentFilters({ query }: { query: URLSearchParams }) {
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
