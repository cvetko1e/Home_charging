import { majorApplianceOptions } from "@/lib/catalogs";
import type { AssessmentStatus } from "@/types/assessment";

export function formatAssessmentStatus(status: AssessmentStatus) {
  return status === "completed" ? "Completed" : "Draft";
}

export function formatMajorAppliances(appliances?: string[]) {
  if (!appliances?.length) {
    return "";
  }

  return appliances
    .map(
      (value) =>
        majorApplianceOptions.find((option) => option.value === value)?.label ??
        value,
    )
    .join(", ");
}

export function isEmptyValue(value: unknown) {
  return value === undefined || value === null || value === "";
}
