import { ObjectId, type Collection } from "mongodb";
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
};

const collectionName = "assessments";

async function getAssessmentsCollection(): Promise<
  Collection<AssessmentDocument>
> {
  const db = await getMongoDb();

  return db.collection<AssessmentDocument>(collectionName);
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
