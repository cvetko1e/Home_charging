import {
  reviewStepNumber,
  type AssessmentStepNumber,
  type SurveyStepNumber,
} from "@/types/assessment";

export function getPreviousStep(step: AssessmentStepNumber): SurveyStepNumber {
  return Math.max(1, step - 1) as SurveyStepNumber;
}

export function isStepAvailable(
  step: AssessmentStepNumber,
  lastCompletedStep: number,
) {
  return (
    step <= lastCompletedStep + 1 ||
    (step === reviewStepNumber && lastCompletedStep >= 6)
  );
}
