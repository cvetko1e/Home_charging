export default function AdminDashboardLoading() {
  return (
    <section className="grid gap-6" aria-busy="true">
      <div className="h-24 rounded-md bg-white/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-28 rounded-md bg-white/10" />
        ))}
      </div>
      <div className="h-96 rounded-md bg-white/10" />
    </section>
  );
}
