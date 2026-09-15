"use client";

import { reviewStepNumber, type SurveyStepNumber } from "@/types/assessment";
import { isStepAvailable } from "@/lib/assessment-navigation";

const steps: Array<{
  number: SurveyStepNumber | typeof reviewStepNumber;
  label: string;
}> = [
  { number: 1, label: "Personal" },
  { number: 2, label: "Vehicle" },
  { number: 3, label: "Panel" },
  { number: 4, label: "Installation" },
  { number: 5, label: "Home" },
  { number: 6, label: "Charger" },
  { number: reviewStepNumber, label: "Review" },
];

export function ProgressIndicator({
  activeStep,
  lastCompletedStep,
  onStepSelect,
}: {
  activeStep: SurveyStepNumber | typeof reviewStepNumber;
  lastCompletedStep: number;
  onStepSelect: (step: SurveyStepNumber | typeof reviewStepNumber) => void;
}) {
  return (
    <nav aria-label="Assessment progress" className="mt-8">
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {steps.map((step) => {
          const isActive = step.number === activeStep;
          const isAvailable =
            isStepAvailable(step.number, lastCompletedStep);

          return (
            <li key={step.number}>
              <button
                type="button"
                aria-current={isActive ? "step" : undefined}
                disabled={!isAvailable}
                onClick={() => onStepSelect(step.number)}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 ${
                  isActive
                    ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                } disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-white`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                  {step.number}
                </span>
                <span className="font-medium">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
