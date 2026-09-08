import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {children}
    </main>
  );
}
