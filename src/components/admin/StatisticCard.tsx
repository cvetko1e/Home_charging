export function StatisticCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-neutral-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}
