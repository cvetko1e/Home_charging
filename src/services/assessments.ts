import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";
import {
  completeAssessmentDraft,
  findAssessmentById,
  insertAssessmentDraft,
  type AssessmentDocument,
  updateAssessmentDraftStep,
} from "@/repositories/assessments";
import { AssessmentServiceError } from "@/services/errors";
import {
  assessmentSectionsSchema,
  getSurveyStepSchema,
} from "@/validation/assessment";
import {
  reviewStepNumber,
  type Assessment,
  type AssessmentSections,
  type SurveyStepNumber,
} from "@/types/assessment";

const tokenByteLength = 32;

function createResumeToken() {
  return randomBytes(tokenByteLength).toString("base64url");
}

function hashResumeToken(resumeToken: string) {
  return createHash("sha256").update(resumeToken).digest("hex");
}

function isResumeTokenMatch(resumeToken: string, storedHash: string) {
  const incomingHash = hashResumeToken(resumeToken);
  const incomingBuffer = Buffer.from(incomingHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  return (
    incomingBuffer.length === storedBuffer.length &&
    timingSafeEqual(incomingBuffer, storedBuffer)
  );
}

function assertValidObjectId(assessmentId: string) {
  if (!ObjectId.isValid(assessmentId)) {
    throw new AssessmentServiceError(400, "A valid assessment id is required.");
  }
}

function assertAuthorized(document: AssessmentDocument, resumeToken: string) {
  if (!isResumeTokenMatch(resumeToken, document.resumeTokenHash)) {
    throw new AssessmentServiceError(
      404,
      "Assessment was not found or the resume token is invalid.",
    );
  }
}

function toAssessment(document: AssessmentDocument): Assessment {
  return {
    id: document._id.toHexString(),
    status: document.status,
    currentStep: document.currentStep,
    lastCompletedStep: document.lastCompletedStep,
    sections: document.sections,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    lastActivityAt: document.lastActivityAt.toISOString(),
    completedAt: document.completedAt?.toISOString(),
  };
}

async function getAuthorizedAssessmentDocument(
  assessmentId: string,
  resumeToken: string,
) {
  assertValidObjectId(assessmentId);

  const document = await findAssessmentById(assessmentId);

  if (!document) {
    throw new AssessmentServiceError(
      404,
      "Assessment was not found or the resume token is invalid.",
    );
  }

  assertAuthorized(document, resumeToken);

  return document;
}

export async function createAssessmentDraft() {
  const now = new Date();
  const resumeToken = createResumeToken();

  const document: AssessmentDocument = {
    _id: new ObjectId(),
    status: "draft",
    currentStep: 1,
    lastCompletedStep: 0,
    sections: {},
    resumeTokenHash: hashResumeToken(resumeToken),
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };

  await insertAssessmentDraft(document);

  return {
    assessment: toAssessment(document),
    resumeToken,
  };
}

export async function getAuthorizedAssessment(
  assessmentId: string,
  resumeToken: string,
) {
  const document = await getAuthorizedAssessmentDocument(
    assessmentId,
    resumeToken,
  );

  return toAssessment(document);
}

export async function saveAssessmentStep(
  assessmentId: string,
  resumeToken: string,
  step: SurveyStepNumber,
  data: unknown,
) {
  const document = await getAuthorizedAssessmentDocument(
    assessmentId,
    resumeToken,
  );

  if (document.status === "completed") {
    throw new AssessmentServiceError(
      409,
      "Completed assessments cannot be edited.",
    );
  }

  const schema = getSurveyStepSchema(step);
  const parsedData = schema.parse(data);
  const nextStep = step === 6 ? reviewStepNumber : ((step + 1) as SurveyStepNumber);
  const now = new Date();
  const sections: AssessmentSections = {
    ...document.sections,
    [stepToSectionKey(step)]: parsedData,
  };

  const updatedDocument = await updateAssessmentDraftStep(assessmentId, {
    currentStep: nextStep,
    lastCompletedStep: Math.max(document.lastCompletedStep, step),
    sections,
    updatedAt: now,
    lastActivityAt: now,
  });

  if (!updatedDocument) {
    throw new AssessmentServiceError(404, "Assessment could not be updated.");
  }

  return toAssessment(updatedDocument);
}

export async function completeAssessment(
  assessmentId: string,
  resumeToken: string,
) {
  const document = await getAuthorizedAssessmentDocument(
    assessmentId,
    resumeToken,
  );

  if (document.status === "completed") {
    throw new AssessmentServiceError(
      409,
      "This assessment has already been submitted.",
    );
  }

  const completionCheck = assessmentSectionsSchema.safeParse(document.sections);

  if (!completionCheck.success) {
    throw new AssessmentServiceError(
      400,
      "Complete every assessment step before submitting.",
      completionCheck.error.flatten(),
    );
  }

  const now = new Date();
  const updatedDocument = await completeAssessmentDraft(assessmentId, {
    status: "completed",
    currentStep: reviewStepNumber,
    lastCompletedStep: reviewStepNumber,
    updatedAt: now,
    lastActivityAt: now,
    completedAt: now,
  });

  if (!updatedDocument) {
    throw new AssessmentServiceError(404, "Assessment could not be submitted.");
  }

  return toAssessment(updatedDocument);
}

function stepToSectionKey(step: SurveyStepNumber) {
  switch (step) {
    case 1:
      return "personalDetails";
    case 2:
      return "vehicleDetails";
    case 3:
      return "electricalPanel";
    case 4:
      return "chargerInstallation";
    case 5:
      return "homeInformation";
    case 6:
      return "evCharger";
  }
}
