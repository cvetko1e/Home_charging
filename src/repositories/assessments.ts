import { ObjectId, type Collection, type Document, type Sort } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import type {
  AssessmentSections,
  AssessmentStatus,
  AssessmentStepNumber,
} from "@/types/assessment";

export type AssessmentDocument = {
  _id: ObjectId;
  status: AssessmentStatus;
  currentStep: AssessmentStepNumber;
  lastCompletedStep: number;
  sections: AssessmentSections;
  resumeTokenHash: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  adminNotes?: string;
};

const collectionName = "assessments";

export type AssessmentAdminSortField =
  | "createdAt"
  | "lastActivityAt"
  | "status"
  | "lastCompletedStep"
  | "customerName"
  | "vehicle";

export type AssessmentAdminFilters = {
  search?: string;
  status?: AssessmentStatus;
  createdFrom?: Date;
  createdTo?: Date;
  lastCompletedStep?: number;
  customerName?: string;
  email?: string;
  vehicleManufacturer?: string;
  vehicleModel?: string;
  chargerPurchase?: "yes" | "no";
};

export type AssessmentAdminListOptions = {
  page: number;
  pageSize: number;
  sort: AssessmentAdminSortField;
  direction: "asc" | "desc";
  filters: AssessmentAdminFilters;
};

export type AssessmentAdminEditableFields = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  adminNotes: string;
}>;

export type AssessmentRepositoryStats = {
  totalAssessments: number;
  completedAssessments: number;
  draftAssessments: number;
  inactiveDraftAssessments: number;
  dropOffs: Array<{ step: number; count: number }>;
  recentlySubmittedAssessments: AssessmentDocument[];
};

async function getAssessmentsCollection(): Promise<
  Collection<AssessmentDocument>
> {
  const db = await getMongoDb();

  return db.collection<AssessmentDocument>(collectionName);
}

export async function createAssessmentIndexes() {
  const collection = await getAssessmentsCollection();

  await collection.createIndexes([
    { key: { status: 1 } },
    { key: { createdAt: -1 } },
    { key: { lastActivityAt: -1 } },
    { key: { lastCompletedStep: 1 } },
    { key: { completedAt: -1 } },
    { key: { "sections.personalDetails.email": 1 } },
    { key: { "sections.personalDetails.firstName": 1 } },
    { key: { "sections.personalDetails.lastName": 1 } },
    { key: { "sections.vehicleDetails.manufacturer": 1 } },
    { key: { "sections.vehicleDetails.model": 1 } },
    { key: { "sections.evCharger.wantsToPurchaseCharger": 1 } },
  ]);
}

export async function insertAssessmentDraft(document: AssessmentDocument) {
  const collection = await getAssessmentsCollection();
  await collection.insertOne(document);

  return document;
}

export async function findAssessmentById(assessmentId: string) {
  const collection = await getAssessmentsCollection();

  return collection.findOne({ _id: new ObjectId(assessmentId) });
}

export async function listAssessmentsForAdmin(
  options: AssessmentAdminListOptions,
) {
  const collection = await getAssessmentsCollection();
  const filter = buildAssessmentAdminFilter(options.filters);
  const skip = (options.page - 1) * options.pageSize;
  const sort = buildAssessmentAdminSort(options.sort, options.direction);
  const [documents, total] = await Promise.all([
    collection
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(options.pageSize)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    documents,
    total,
  };
}

export async function findAssessmentForAdmin(assessmentId: string) {
  return findAssessmentById(assessmentId);
}

export async function updateAssessmentDraftStep(
  assessmentId: string,
  updates: Pick<
    AssessmentDocument,
    "currentStep" | "lastCompletedStep" | "sections" | "updatedAt" | "lastActivityAt"
  >,
) {
  const collection = await getAssessmentsCollection();
  const _id = new ObjectId(assessmentId);

  const result = await collection.updateOne(
    { _id, status: "draft" },
    {
      $set: updates,
    },
  );

  if (result.matchedCount === 0) {
    return null;
  }

  return collection.findOne({ _id });
}

export async function completeAssessmentDraft(
  assessmentId: string,
  updates: Pick<
    AssessmentDocument,
    | "status"
    | "currentStep"
    | "lastCompletedStep"
    | "updatedAt"
    | "lastActivityAt"
    | "completedAt"
  >,
) {
  const collection = await getAssessmentsCollection();
  const _id = new ObjectId(assessmentId);

  const result = await collection.updateOne(
    { _id, status: "draft" },
    {
      $set: updates,
    },
  );

  if (result.matchedCount === 0) {
    return null;
  }

  return collection.findOne({ _id });
}

export async function updateAssessmentByAdmin(
  assessmentId: string,
  updates: AssessmentAdminEditableFields,
) {
  const collection = await getAssessmentsCollection();
  const _id = new ObjectId(assessmentId);
  const $set: Document = {
    updatedAt: new Date(),
  };

  if (updates.firstName !== undefined) {
    $set["sections.personalDetails.firstName"] = updates.firstName;
  }

  if (updates.lastName !== undefined) {
    $set["sections.personalDetails.lastName"] = updates.lastName;
  }

  if (updates.email !== undefined) {
    $set["sections.personalDetails.email"] = updates.email;
  }

  if (updates.phoneNumber !== undefined) {
    $set["sections.personalDetails.phoneNumber"] = updates.phoneNumber;
  }

  if (updates.adminNotes !== undefined) {
    $set.adminNotes = updates.adminNotes;
  }

  const result = await collection.updateOne(
    { _id },
    {
      $set,
    },
  );

  if (result.matchedCount === 0) {
    return null;
  }

  return collection.findOne({ _id });
}

export async function getAssessmentRepositoryStats(
  inactiveBefore: Date,
  recentLimit = 5,
): Promise<AssessmentRepositoryStats> {
  const collection = await getAssessmentsCollection();
  const [
    totalAssessments,
    completedAssessments,
    draftAssessments,
    inactiveDraftAssessments,
    dropOffs,
    recentlySubmittedAssessments,
  ] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ status: "completed" }),
    collection.countDocuments({ status: "draft" }),
    collection.countDocuments({
      status: "draft",
      lastActivityAt: { $lt: inactiveBefore },
    }),
    collection
      .aggregate<{ _id: number; count: number }>([
        {
          $match: {
            status: "draft",
          },
        },
        {
          $group: {
            _id: "$lastCompletedStep",
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ])
      .toArray(),
    collection
      .find({ status: "completed" })
      .sort({ completedAt: -1, lastActivityAt: -1 })
      .limit(recentLimit)
      .toArray(),
  ]);

  return {
    totalAssessments,
    completedAssessments,
    draftAssessments,
    inactiveDraftAssessments,
    dropOffs: dropOffs.map((entry) => ({
      step: entry._id,
      count: entry.count,
    })),
    recentlySubmittedAssessments,
  };
}

function buildAssessmentAdminFilter(filters: AssessmentAdminFilters) {
  const conditions: Document[] = [];

  if (filters.status) {
    conditions.push({ status: filters.status });
  }

  const createdAtRange: Document = {};

  if (filters.createdFrom) {
    createdAtRange.$gte = filters.createdFrom;
  }

  if (filters.createdTo) {
    createdAtRange.$lte = endOfDay(filters.createdTo);
  }

  if (Object.keys(createdAtRange).length > 0) {
    conditions.push({ createdAt: createdAtRange });
  }

  if (filters.lastCompletedStep !== undefined) {
    conditions.push({ lastCompletedStep: filters.lastCompletedStep });
  }

  if (filters.customerName) {
    const expression = createSafeRegex(filters.customerName);

    conditions.push({
      $or: [
        { "sections.personalDetails.firstName": expression },
        { "sections.personalDetails.lastName": expression },
      ],
    });
  }

  if (filters.email) {
    conditions.push({
      "sections.personalDetails.email": createSafeRegex(filters.email),
    });
  }

  if (filters.vehicleManufacturer) {
    conditions.push({
      "sections.vehicleDetails.manufacturer": createSafeRegex(
        filters.vehicleManufacturer,
      ),
    });
  }

  if (filters.vehicleModel) {
    conditions.push({
      "sections.vehicleDetails.model": createSafeRegex(filters.vehicleModel),
    });
  }

  if (filters.chargerPurchase) {
    conditions.push({
      "sections.evCharger.wantsToPurchaseCharger":
        filters.chargerPurchase === "yes",
    });
  }

  if (filters.search) {
    const expression = createSafeRegex(filters.search);

    conditions.push({
      $or: [
        { "sections.personalDetails.firstName": expression },
        { "sections.personalDetails.lastName": expression },
        { "sections.personalDetails.email": expression },
        { "sections.personalDetails.phoneNumber": expression },
        { "sections.vehicleDetails.manufacturer": expression },
        { "sections.vehicleDetails.model": expression },
      ],
    });
  }

  if (conditions.length === 0) {
    return {};
  }

  return { $and: conditions };
}

function buildAssessmentAdminSort(
  sort: AssessmentAdminSortField,
  direction: "asc" | "desc",
): Sort {
  const value = direction === "asc" ? 1 : -1;

  switch (sort) {
    case "customerName":
      return {
        "sections.personalDetails.lastName": value,
        "sections.personalDetails.firstName": value,
        createdAt: -1,
      };
    case "vehicle":
      return {
        "sections.vehicleDetails.manufacturer": value,
        "sections.vehicleDetails.model": value,
        createdAt: -1,
      };
    case "status":
    case "lastCompletedStep":
    case "createdAt":
    case "lastActivityAt":
      return {
        [sort]: value,
        createdAt: -1,
      };
  }
}

function createSafeRegex(value: string) {
  return new RegExp(escapeRegExp(value.trim()), "i");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);

  return nextDate;
}
