export function StatusPanel({
  children,
  message,
  title,
}: {
  children?: React.ReactNode;
  message: string;
  title: string;
}) {
  return (
    <section className="mx-auto mt-20 max-w-xl rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase text-emerald-700">
        Home Charging Assessment
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-neutral-950">{title}</h1>
      <p className="mt-4 text-base leading-7 text-neutral-700">{message}</p>
      {children}
    </section>
  );
}
