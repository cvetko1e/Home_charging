export function FieldError({ message }: { message: string }) {
  return <p className="mt-2 text-sm font-medium text-red-700">{message}</p>;
}
