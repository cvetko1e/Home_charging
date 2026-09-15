"use client";

import type { AssessmentSections, SurveyStepNumber } from "@/types/assessment";
import { formatMajorAppliances, isEmptyValue } from "@/lib/assessment-display";
import { StepHeader } from "../StepHeader";

export function ReviewStep({
  isCompleting,
  onBack,
  onEdit,
  onSubmit,
  sections,
}: {
  isCompleting: boolean;
  onBack: () => void;
  onEdit: (step: SurveyStepNumber) => void;
  onSubmit: () => void;
  sections: AssessmentSections;
}) {
  return (
    <div>
      <StepHeader
        title="Review and submission"
        description="Review the saved answers before submitting the installation request."
      />
      <div className="mt-6 grid gap-4">
        <ReviewSection
          title="Personal details"
          onEdit={() => onEdit(1)}
          rows={[
            ["First name", sections.personalDetails?.firstName],
            ["Last name", sections.personalDetails?.lastName],
            ["Email", sections.personalDetails?.email],
            ["Phone number", sections.personalDetails?.phoneNumber],
          ]}
        />
        <ReviewSection
          title="Vehicle details"
          onEdit={() => onEdit(2)}
          rows={[
            ["Manufacturer", sections.vehicleDetails?.manufacturer],
            ["Model", sections.vehicleDetails?.model],
            ["Year", sections.vehicleDetails?.year],
          ]}
        />
        <ReviewSection
          title="Electrical panel"
          onEdit={() => onEdit(3)}
          rows={[
            ["Panel location", sections.electricalPanel?.panelLocation],
            [
              "Main breaker capacity",
              sections.electricalPanel?.mainBreakerCapacity,
            ],
            ["Available slots", sections.electricalPanel?.availableSlots],
          ]}
        />
        <ReviewSection
          title="Charger installation"
          onEdit={() => onEdit(4)}
          rows={[
            [
              "Proposed charger location",
              sections.chargerInstallation?.proposedChargerLocation,
            ],
            [
              "Distance from panel",
              sections.chargerInstallation?.distanceFromPanel,
            ],
          ]}
        />
        <ReviewSection
          title="Home information"
          onEdit={() => onEdit(5)}
          rows={[
            ["Address", sections.homeInformation?.address],
            [
              "Major appliances",
              formatMajorAppliances(sections.homeInformation?.majorAppliances),
            ],
          ]}
        />
        <ReviewSection
          title="EV charger"
          onEdit={() => onEdit(6)}
          rows={[
            [
              "Wants to purchase charger",
              sections.evCharger?.wantsToPurchaseCharger ? "Yes" : "No",
            ],
            ["Charger brand", sections.evCharger?.chargerBrand],
            ["Charger model", sections.evCharger?.chargerModel],
          ]}
        />
      </div>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:ring-offset-2"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={isCompleting}
          onClick={onSubmit}
          className="rounded-md bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCompleting ? "Submitting..." : "Submit Assessment"}
        </button>
      </div>
    </div>
  );
}

function ReviewSection({
  onEdit,
  rows,
  title,
}: {
  onEdit: () => void;
  rows: Array<[string, React.ReactNode]>;
  title: string;
}) {
  return (
    <section className="rounded-md border border-neutral-200">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-semibold text-emerald-800 hover:text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
        >
          Edit
        </button>
      </div>
      <dl className="grid gap-0 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="border-t border-neutral-100 px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-neutral-500">
              {label}
            </dt>
            <dd className="mt-1 text-sm text-neutral-900">
              {isEmptyValue(value) ? (
                <span className="text-neutral-500">Not provided</span>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
