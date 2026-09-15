import { ObjectId } from "mongodb";
import { createOpaqueToken, hashSecret, isSecretHashMatch } from "@/lib/security";
import {
  completeAssessmentDraft,
  findAssessmentById,
  insertAssessmentDraft,
  type AssessmentDocument,
  updateAssessmentDraftStep,
} from "@/repositories/assessments";
import { failure, success, validationFailure } from "@/lib/result";
import type { Result } from "@/types/result";
import { validateObjectId } from "@/validation/object-id";
import { validateChargerChoice, validateVehicleChoice } from "@/services/catalogs";
import {
  assessmentSectionsSchema,
  getSurveyStepSchema,
} from "@/validation/assessment";
import {
  reviewStepNumber,
  type Assessment,
  type AssessmentSections,
  type SurveyStepKey,
  type SurveyStepNumber,
} from "@/types/assessment";

export function createResumeToken(): string {
  return createOpaqueToken();
}

export function hashResumeToken(resumeToken: string): string {
  return hashSecret(resumeToken);
}

export function isResumeTokenMatch(resumeToken: string, storedHash: string): boolean {
  return isSecretHashMatch(resumeToken, storedHash);
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
): Promise<Result<AssessmentDocument>> {
  const idCheck = validateObjectId(assessmentId);
  if (!idCheck.success) return idCheck;

  const document = await findAssessmentById(assessmentId);

  if (!document || !isResumeTokenMatch(resumeToken, document.resumeTokenHash)) {
    return failure(
      "NOT_FOUND",
      "Assessment was not found or the resume token is invalid.",
    );
  }

  return success(document);
}

export async function createAssessmentDraft(): Promise<{
  assessment: Assessment;
  resumeToken: string;
}> {
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
): Promise<Result<Assessment>> {
  const result = await getAuthorizedAssessmentDocument(
    assessmentId,
    resumeToken,
  );

  if (!result.success) return result;
  return success(toAssessment(result.data));
}

export async function saveAssessmentStep(
  assessmentId: string,
  resumeToken: string,
  step: SurveyStepNumber,
  data: unknown,
): Promise<Result<Assessment>> {
  const result = await getAuthorizedAssessmentDocument(
    assessmentId,
    resumeToken,
  );
  if (!result.success) return result;
  const document = result.data;

  if (document.status === "completed") {
    return failure(
      "CONFLICT",
      "Completed assessments cannot be edited.",
    );
  }

  const schema = getSurveyStepSchema(step);
  const parsedData = schema.safeParse(data);
  if (!parsedData.success) return validationFailure(parsedData.error);
  let validatedData = parsedData.data;
  if (step === 2) {
    const choice = await validateVehicleChoice(parsedData.data);
    if (!choice.success) return choice;
    validatedData = choice.data;
  }
  if (step === 6) {
    const choice = await validateChargerChoice(parsedData.data);
    if (!choice.success) return choice;
    validatedData = choice.data;
  }
  const nextStep = step === 6 ? reviewStepNumber : ((step + 1) as SurveyStepNumber);
  const now = new Date();
  const sections: AssessmentSections = {
    ...document.sections,
    [stepToSectionKey(step)]: validatedData,
  };

  const updatedDocument = await updateAssessmentDraftStep(assessmentId, {
    currentStep: nextStep,
    lastCompletedStep: Math.max(document.lastCompletedStep, step),
    sections,
    updatedAt: now,
    lastActivityAt: now,
  });

  if (!updatedDocument) {
    return failure("NOT_FOUND", "Assessment could not be updated.");
  }

  return success(toAssessment(updatedDocument));
}

export async function completeAssessment(
  assessmentId: string,
  resumeToken: string,
): Promise<Result<Assessment>> {
  const result = await getAuthorizedAssessmentDocument(
    assessmentId,
    resumeToken,
  );
  if (!result.success) return result;
  const document = result.data;

  if (document.status === "completed") {
    return failure(
      "CONFLICT",
      "This assessment has already been submitted.",
    );
  }

  const completionCheck = assessmentSectionsSchema.safeParse(document.sections);

  if (!completionCheck.success) {
    return failure(
      "INVALID_REQUEST",
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
    return failure("NOT_FOUND", "Assessment could not be submitted.");
  }

  return success(toAssessment(updatedDocument));
}

function stepToSectionKey(step: SurveyStepNumber): SurveyStepKey {
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
