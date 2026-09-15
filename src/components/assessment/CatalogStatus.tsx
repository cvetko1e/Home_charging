import type { CatalogState } from "@/hooks/use-catalogs";

export function CatalogStatus({ state, label, onRetry }: {
  state: CatalogState<unknown>;
  label: string;
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return <p role="status" className="mt-5 text-sm text-neutral-700">Loading {label}...</p>;
  }
  if (state.status === "error") {
    return (
      <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <p role="alert">{state.message}</p>
        <button type="button" onClick={onRetry} className="mt-2 font-semibold underline focus:outline-none focus:ring-2 focus:ring-red-700">
          Try again
        </button>
      </div>
    );
  }
  return null;
}
