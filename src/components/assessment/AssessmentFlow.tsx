"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Assessment,
  AssessmentResponse,
  AssessmentStepNumber,
  SurveyStepNumber,
} from "@/types/assessment";
import { reviewStepNumber } from "@/types/assessment";
import { getPreviousStep } from "@/lib/assessment-navigation";
import {
  createNewAssessment,
  initializeAssessment,
  readApiResponse,
  removeStoredDraft,
  type AssessmentSession,
} from "@/lib/assessment-session";
import { ProgressIndicator } from "./ProgressIndicator";
import { StatusPanel } from "./StatusPanel";
import { PersonalDetailsStep } from "./steps/PersonalDetailsStep";
import { VehicleDetailsStep } from "./steps/VehicleDetailsStep";
import { ElectricalPanelStep } from "./steps/ElectricalPanelStep";
import { ChargerInstallationStep } from "./steps/ChargerInstallationStep";
import { HomeInformationStep } from "./steps/HomeInformationStep";
import { EvChargerStep } from "./steps/EvChargerStep";
import { ReviewStep } from "./steps/ReviewStep";

type FlowState = "loading" | "ready" | "success" | "error";

export function AssessmentFlow() {
  const initializedRef = useRef(false);
  const [flowState, setFlowState] = useState<FlowState>("loading");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [credentials, setCredentials] = useState<
    AssessmentSession["credentials"] | null
  >(null);
  const [activeStep, setActiveStep] = useState<AssessmentStepNumber>(1);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sections = assessment?.sections ?? {};

  const loadAssessment = useCallback(
    async (operation: () => Promise<AssessmentSession>) => {
      setFlowState("loading");
      setMessage(null);
      setErrorMessage(null);

      try {
        const session = await operation();
        setCredentials(session.credentials);
        setAssessment(session.assessment);
        setActiveStep(session.assessment.currentStep);
        setFlowState(session.assessment.status === "completed" ? "success" : "ready");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The assessment could not be started.",
        );
        setFlowState("error");
      }
    },
    [],
  );

  const startNewAssessment = useCallback(
    () => loadAssessment(createNewAssessment),
    [loadAssessment],
  );

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    void loadAssessment(initializeAssessment);
  }, [loadAssessment]);

  async function saveStep(step: SurveyStepNumber, data: unknown) {
    if (!credentials) {
      setErrorMessage("Assessment resume session is missing.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/assessments/${credentials.assessmentId}/steps/${step}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data,
          }),
        },
      );
      const payload = await readApiResponse<AssessmentResponse>(response);

      setAssessment(payload.assessment);
      setActiveStep(payload.assessment.currentStep);
      setMessage("Step saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The step could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitAssessment() {
    if (!credentials) {
      setErrorMessage("Assessment resume session is missing.");
      return;
    }

    setCompleting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/assessments/${credentials.assessmentId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
      const payload = await readApiResponse<AssessmentResponse>(response);

      setAssessment(payload.assessment);
      removeStoredDraft();
      setFlowState("success");
      setMessage("Assessment submitted successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The assessment could not be submitted.",
      );
    } finally {
      setCompleting(false);
    }
  }

  function goBack() {
    setMessage(null);
    setErrorMessage(null);
    setActiveStep(getPreviousStep);
  }

  function editStep(step: SurveyStepNumber) {
    setMessage(null);
    setErrorMessage(null);
    setActiveStep(step);
  }

  const statusContent = useMemo(() => {
    if (flowState === "loading") {
      return (
        <StatusPanel
          title="Preparing your assessment"
          message="A secure draft is being created or restored."
        />
      );
    }

    if (flowState === "error") {
      return (
        <StatusPanel
          title="Assessment unavailable"
          message={
            errorMessage ??
            "The assessment could not be loaded. Check the environment configuration and try again."
          }
        >
          <button
            type="button"
            onClick={() => void startNewAssessment()}
            className="mt-6 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
          >
            Start New Assessment
          </button>
        </StatusPanel>
      );
    }

    if (flowState === "success") {
      return (
        <StatusPanel
          title="Assessment submitted"
          message="Your installation request has been submitted. A project team member can review it in the future admin workflow."
        >
          <Link
            href="/"
            className="mt-6 inline-flex rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:ring-offset-2"
          >
            Return Home
          </Link>
        </StatusPanel>
      );
    }

    return null;
  }, [errorMessage, flowState, startNewAssessment]);

  if (flowState !== "ready") {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-10 text-neutral-950">
        {statusContent}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-800 hover:text-emerald-950"
        >
          Back to home
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase text-emerald-700">
            Installation request
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">
            Home Charging Assessment
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-700">
            Complete each step so the future installation team has the details
            needed to review your home charging request.
          </p>
        </div>

        <ProgressIndicator
          activeStep={activeStep}
          lastCompletedStep={assessment?.lastCompletedStep ?? 0}
          onStepSelect={(step) => setActiveStep(step)}
        />

        <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          {message ? (
            <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              {message}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
              {errorMessage}
            </p>
          ) : null}

          {activeStep === 1 ? (
            <PersonalDetailsStep
              defaultValues={sections.personalDetails}
              isSaving={saving}
              onSave={(data) => saveStep(1, data)}
            />
          ) : null}
          {activeStep === 2 ? (
            <VehicleDetailsStep
              defaultValues={sections.vehicleDetails}
              isSaving={saving}
              onBack={goBack}
              onSave={(data) => saveStep(2, data)}
            />
          ) : null}
          {activeStep === 3 ? (
            <ElectricalPanelStep
              defaultValues={sections.electricalPanel}
              isSaving={saving}
              onBack={goBack}
              onSave={(data) => saveStep(3, data)}
            />
          ) : null}
          {activeStep === 4 ? (
            <ChargerInstallationStep
              defaultValues={sections.chargerInstallation}
              isSaving={saving}
              onBack={goBack}
              onSave={(data) => saveStep(4, data)}
            />
          ) : null}
          {activeStep === 5 ? (
            <HomeInformationStep
              defaultValues={sections.homeInformation}
              isSaving={saving}
              onBack={goBack}
              onSave={(data) => saveStep(5, data)}
            />
          ) : null}
          {activeStep === 6 ? (
            <EvChargerStep
              defaultValues={sections.evCharger}
              isSaving={saving}
              onBack={goBack}
              onSave={(data) => saveStep(6, data)}
            />
          ) : null}
          {activeStep === reviewStepNumber ? (
            <ReviewStep
              isCompleting={completing}
              onBack={goBack}
              onEdit={editStep}
              onSubmit={() => void submitAssessment()}
              sections={sections}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
