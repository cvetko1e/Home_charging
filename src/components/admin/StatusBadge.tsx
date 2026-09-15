import { formatAssessmentStatus } from "@/lib/assessment-display";
import type { AssessmentStatus } from "@/types/assessment";

export function StatusBadge({ status }: { status: AssessmentStatus }) {
  const isCompleted = status === "completed";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isCompleted
          ? "bg-emerald-100 text-emerald-900"
          : "bg-amber-100 text-amber-900"
      }`}
    >
      {formatAssessmentStatus(status)}
    </span>
  );
}
