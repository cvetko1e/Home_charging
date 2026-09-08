import Link from "next/link";
import { AdminAssessmentEditForm } from "@/components/admin/AdminAssessmentEditForm";
import { majorApplianceOptions } from "@/lib/catalogs";
import { getAdminAssessmentDetail } from "@/services/adminAssessments";
import { requireAdminSession } from "@/services/adminSession";
import type { AdminAssessmentDetail } from "@/types/admin";

export const dynamic = "force-dynamic";

type AssessmentDetailPageProps = {
  params: Promise<{
    assessmentId: string;
  }>;
};

export default async function AssessmentDetailPage({
  params,
}: AssessmentDetailPageProps) {
  await requireAdminSession();

  const { assessmentId } = await params;
  const assessment = await getAdminAssessmentDetail(assessmentId);
  const personalDetails = assessment.sections.personalDetails;

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/dashboard"
            className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Back to dashboard
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase text-emerald-300">
            Assessment detail
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            {formatCustomerName(assessment)}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-300">
            Assessment id {assessment.id}
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <p className="font-semibold text-white">{formatStatus(assessment.status)}</p>
          <p className="mt-1 text-neutral-300">
            Last activity {formatDateTime(assessment.lastActivityAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Status" value={formatStatus(assessment.status)} />
        <SummaryTile
          label="Last completed step"
          value={String(assessment.lastCompletedStep)}
        />
        <SummaryTile label="Created" value={formatDateTime(assessment.createdAt)} />
        <SummaryTile
          label="Submitted"
          value={formatDateTime(assessment.completedAt)}
        />
      </div>

      <AdminAssessmentEditForm
        assessmentId={assessment.id}
        defaultValues={{
          firstName: personalDetails?.firstName ?? "",
          lastName: personalDetails?.lastName ?? "",
          email: personalDetails?.email ?? "",
          phoneNumber: personalDetails?.phoneNumber ?? "",
          adminNotes: assessment.adminNotes,
        }}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <DetailSection
          title="Personal details"
          rows={[
            ["First name", personalDetails?.firstName],
            ["Last name", personalDetails?.lastName],
            ["Email", personalDetails?.email],
            ["Phone number", personalDetails?.phoneNumber],
          ]}
        />
        <DetailSection
          title="Vehicle details"
          rows={[
            ["Manufacturer", assessment.sections.vehicleDetails?.manufacturer],
            ["Model", assessment.sections.vehicleDetails?.model],
            ["Year", assessment.sections.vehicleDetails?.year],
          ]}
        />
        <DetailSection
          title="Electrical panel information"
          rows={[
            ["Panel location", assessment.sections.electricalPanel?.panelLocation],
            [
              "Main breaker capacity",
              assessment.sections.electricalPanel?.mainBreakerCapacity,
            ],
            ["Available slots", assessment.sections.electricalPanel?.availableSlots],
          ]}
        />
        <DetailSection
          title="Charger installation information"
          rows={[
            [
              "Proposed charger location",
              assessment.sections.chargerInstallation?.proposedChargerLocation,
            ],
            [
              "Distance from panel",
              assessment.sections.chargerInstallation?.distanceFromPanel,
            ],
          ]}
        />
        <DetailSection
          title="Home information"
          rows={[
            ["Address", assessment.sections.homeInformation?.address],
            [
              "Major appliances",
              formatMajorAppliances(
                assessment.sections.homeInformation?.majorAppliances,
              ),
            ],
          ]}
        />
        <DetailSection
          title="EV charger selection"
          rows={[
            [
              "Wants to purchase charger",
              assessment.sections.evCharger?.wantsToPurchaseCharger
                ? "Yes"
                : "No",
            ],
            ["Charger brand", assessment.sections.evCharger?.chargerBrand],
            ["Charger model", assessment.sections.evCharger?.chargerModel],
          ]}
        />
      </div>

      <section className="rounded-md border border-white/10 bg-white p-5 text-neutral-950">
        <h3 className="text-lg font-semibold">Missing sections</h3>
        {assessment.missingSections.length > 0 ? (
          <ul className="mt-4 grid gap-2 text-sm text-neutral-700">
            {assessment.missingSections.map((section) => (
              <li key={section}>{section}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-neutral-600">
            All customer survey sections have been saved.
          </p>
        )}
      </section>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-neutral-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </article>
  );
}

function DetailSection({
  rows,
  title,
}: {
  rows: Array<[string, React.ReactNode]>;
  title: string;
}) {
  return (
    <section className="rounded-md border border-white/10 bg-white text-neutral-950">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <dl className="grid gap-0 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="border-t border-neutral-100 px-5 py-4">
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

function formatCustomerName(assessment: AdminAssessmentDetail) {
  const details = assessment.sections.personalDetails;
  const name = [details?.firstName, details?.lastName].filter(Boolean).join(" ");

  return name || "Unnamed customer";
}

function formatMajorAppliances(appliances?: string[]) {
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

function formatStatus(status: string) {
  return status === "completed" ? "Completed" : "Draft";
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isEmptyValue(value: React.ReactNode) {
  return value === undefined || value === null || value === "";
}
