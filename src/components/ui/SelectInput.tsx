import { FieldError } from "./FieldError";

export function SelectInput({
  children,
  error,
  inputProps,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  inputProps: React.SelectHTMLAttributes<HTMLSelectElement>;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <select
        {...inputProps}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
        aria-invalid={error ? "true" : "false"}
      >
        {children}
      </select>
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}
