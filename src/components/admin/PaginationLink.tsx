import Link from "next/link";

export function PaginationLink({
  children,
  disabled,
  href,
}: {
  children: React.ReactNode;
  disabled: boolean;
  href: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-neutral-200 px-3 py-2 text-neutral-400">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-md border border-neutral-300 px-3 py-2 font-semibold text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600"
    >
      {children}
    </Link>
  );
}
