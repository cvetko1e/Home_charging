import { FieldError } from "./FieldError";

export function TextAreaInput({
  error,
  inputProps,
  label,
}: {
  error?: string;
  inputProps: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <textarea
        {...inputProps}
        rows={3}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        aria-invalid={error ? "true" : "false"}
      />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}
