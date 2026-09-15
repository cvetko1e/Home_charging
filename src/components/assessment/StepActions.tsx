"use client";

export function StepActions({
  isSaving,
  onBack,
}: {
  isSaving: boolean;
  onBack?: () => void;
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:ring-offset-2"
        >
          Previous
        </button>
      ) : (
        <span />
      )}
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-md bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save and continue"}
      </button>
    </div>
  );
}
