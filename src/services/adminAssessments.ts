import {
  findAssessmentForAdmin,
  getAssessmentRepositoryStats,
  listAssessmentsForAdmin,
  updateAssessmentByAdmin,
  type AssessmentAdminEditableFields,
} from "@/repositories/assessments";
import { failure, success, validationFailure } from "@/lib/result";
import type { Result } from "@/types/result";
import type {
  AdminAssessmentDetail,
  AdminAssessmentListItem,
  AdminAssessmentList,
  AdminDashboardStats,
  AssessmentDropOffStat,
} from "@/types/admin";
import type { AssessmentDocument } from "@/repositories/assessments";
import type { SurveyStepKey } from "@/types/assessment";
import { adminAssessmentUpdateSchema, assessmentListQuerySchema } from "@/validation/admin";
import type { AssessmentListQuery } from "@/validation/admin";
import { getDraftInactivityDays } from "@/lib/env";
import { personalDetailsSchema } from "@/validation/assessment";
import { validateObjectId } from "@/validation/object-id";

const adminContactFields = [
  "firstName",
  "lastName",
  "email",
  "phoneNumber",
] as const;

const incompletePersonalDetailsMessage =
  "Contact fields cannot be updated because the personal details section is missing or incomplete.";

const surveySections: Array<{
  key: SurveyStepKey;
  label: string;
}> = [
  {
    key: "personalDetails",
    label: "Personal details",
  },
  {
    key: "vehicleDetails",
    label: "Vehicle details",
  },
  {
    key: "electricalPanel",
    label: "Electrical panel information",
  },
  {
    key: "chargerInstallation",
    label: "Charger installation information",
  },
  {
    key: "homeInformation",
    label: "Home information",
  },
  {
    key: "evCharger",
    label: "EV charger selection",
  },
];

const dropOffLabels = [
  "Started without saving step one",
  "Stopped after personal details",
  "Stopped after vehicle details",
  "Stopped after electrical panel",
  "Stopped after installation details",
  "Stopped after home information",
  "Stopped after EV charger selection",
];

export function parseAssessmentListSearchParams(
  searchParams: URLSearchParams,
): Result<AssessmentListQuery> {
  const rawValues = Object.fromEntries(searchParams.entries());
  const parsed = assessmentListQuerySchema.safeParse(rawValues);
  if (!parsed.success) return validationFailure(parsed.error);

  return success({
    ...parsed.data,
    pageSize: Math.min(parsed.data.pageSize, 50),
  });
}

export async function getAdminAssessmentList(query: AssessmentListQuery): Promise<AdminAssessmentList> {
  const { documents, total } = await listAssessmentsForAdmin({
    page: query.page,
    pageSize: query.pageSize,
    sort: query.sort,
    direction: query.direction,
    filters: {
      search: query.search,
      status: query.status,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      lastCompletedStep: query.lastCompletedStep,
      customerName: query.customerName,
      email: query.email,
      vehicleManufacturer: query.vehicleManufacturer,
      vehicleModel: query.vehicleModel,
      chargerPurchase: query.chargerPurchase,
    },
  });

  return {
    assessments: documents.map(toAdminAssessmentListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getAdminAssessmentDetail(assessmentId: string): Promise<Result<AdminAssessmentDetail>> {
  const idCheck = validateObjectId(assessmentId);
  if (!idCheck.success) return idCheck;

  const document = await findAssessmentForAdmin(assessmentId);

  if (!document) {
    return failure("NOT_FOUND", "Assessment was not found.");
  }

  return success(toAdminAssessmentDetail(document));
}

export async function updateAdminAssessment(
  assessmentId: string,
  updates: AssessmentAdminEditableFields,
): Promise<Result<AdminAssessmentDetail>> {
  const idCheck = validateObjectId(assessmentId);
  if (!idCheck.success) return idCheck;

  const updateCheck = adminAssessmentUpdateSchema.safeParse(updates);
  if (!updateCheck.success) return validationFailure(updateCheck.error);
  updates = updateCheck.data;

  const updatesContactFields = hasContactFieldUpdates(updates);

  if (updatesContactFields) {
    const existingDocument = await findAssessmentForAdmin(assessmentId);

    if (!existingDocument) {
      return failure("NOT_FOUND", "Assessment was not found.");
    }

    if (!personalDetailsSchema.safeParse(existingDocument.sections.personalDetails).success) {
      return failure("CONFLICT", incompletePersonalDetailsMessage);
    }
  }

  const document = await updateAssessmentByAdmin(assessmentId, updates);

  if (!document) {
    if (updatesContactFields) {
      const existingDocument = await findAssessmentForAdmin(assessmentId);

      if (existingDocument) {
        return failure("CONFLICT", incompletePersonalDetailsMessage);
      }
    }

    return failure("NOT_FOUND", "Assessment was not found.");
  }

  return success(toAdminAssessmentDetail(document));
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const inactivityDays = getDraftInactivityDays();
  const inactiveBefore = new Date(
    Date.now() - inactivityDays * 24 * 60 * 60 * 1000,
  );
  const stats = await getAssessmentRepositoryStats(inactiveBefore);

  return toAdminDashboardStats(stats, inactivityDays);
}

export function normalizeDropOffStats(
  entries: Array<{ step: number; count: number }>,
): AssessmentDropOffStat[] {
  const countByStep = new Map(entries.map((entry) => [entry.step, entry.count]));

  return [
    {
      step: 0,
      label: dropOffLabels[0],
      count: countByStep.get(0) ?? 0,
    },
    ...dropOffLabels.slice(1).map((label, index) => {
      const step = index + 1;

      return {
        step,
        label,
        count: countByStep.get(step) ?? 0,
      };
    }),
  ];
}

function toAdminDashboardStats(
  stats: {
    totalAssessments: number;
    completedAssessments: number;
    draftAssessments: number;
    inactiveDraftAssessments: number;
    dropOffs: Array<{ step: number; count: number }>;
    recentlySubmittedAssessments: AssessmentDocument[];
  },
  inactivityDays: number,
): AdminDashboardStats {
  return {
    totalAssessments: stats.totalAssessments,
    completedAssessments: stats.completedAssessments,
    draftAssessments: stats.draftAssessments,
    completionPercentage: calculateCompletionPercentage(
      stats.totalAssessments,
      stats.completedAssessments,
    ),
    inactiveDraftAssessments: stats.inactiveDraftAssessments,
    inactiveDraftThresholdDays: inactivityDays,
    dropOffs: normalizeDropOffStats(stats.dropOffs),
    recentlySubmittedAssessments: stats.recentlySubmittedAssessments.map(
      toAdminAssessmentListItem,
    ),
  };
}

export function calculateCompletionPercentage(total: number, completed: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function toAdminAssessmentDetail(
  document: AssessmentDocument,
): AdminAssessmentDetail {
  return {
    id: document._id.toHexString(),
    status: document.status,
    currentStep: document.currentStep,
    lastCompletedStep: document.lastCompletedStep,
    sections: document.sections,
    adminNotes: document.adminNotes ?? "",
    missingSections: surveySections
      .filter((section) => !document.sections[section.key])
      .map((section) => section.label),
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    lastActivityAt: document.lastActivityAt.toISOString(),
    completedAt: document.completedAt?.toISOString(),
  };
}

function toAdminAssessmentListItem(
  document: AssessmentDocument,
): AdminAssessmentListItem {
  const personalDetails = document.sections.personalDetails;
  const vehicleDetails = document.sections.vehicleDetails;
  const customerName = [personalDetails?.firstName, personalDetails?.lastName]
    .filter(Boolean)
    .join(" ");
  const vehicle = [
    vehicleDetails?.year,
    vehicleDetails?.manufacturer,
    vehicleDetails?.model,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: document._id.toHexString(),
    status: document.status,
    lastCompletedStep: document.lastCompletedStep,
    customerName: customerName || "Not provided",
    customerEmail: personalDetails?.email ?? "Not provided",
    vehicle: vehicle || "Not provided",
    vehicleManufacturer: vehicleDetails?.manufacturer ?? "",
    vehicleModel: vehicleDetails?.model ?? "",
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    lastActivityAt: document.lastActivityAt.toISOString(),
    completedAt: document.completedAt?.toISOString(),
  };
}

function hasContactFieldUpdates(updates: AssessmentAdminEditableFields): boolean {
  return adminContactFields.some((field) => updates[field] !== undefined);
}
