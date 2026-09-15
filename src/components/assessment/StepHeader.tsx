export function StepHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
        {description}
      </p>
    </div>
  );
}
