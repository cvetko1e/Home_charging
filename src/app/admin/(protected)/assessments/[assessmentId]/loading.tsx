export default function AssessmentDetailLoading() {
  return (
    <section className="grid gap-6" aria-busy="true">
      <div className="h-32 rounded-md bg-white/10" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-24 rounded-md bg-white/10" />
        ))}
      </div>
      <div className="h-80 rounded-md bg-white/10" />
    </section>
  );
}
