"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useForm,
  useWatch,
  type FieldValues,
  type Resolver,
} from "react-hook-form";
import {
  chargerCatalog,
  getChargerModels,
  getVehicleModels,
  getVehicleYears,
  majorApplianceOptions,
  vehicleCatalog,
} from "@/lib/catalogs";
import type {
  Assessment,
  AssessmentResponse,
  AssessmentSections,
  ChargerInstallation,
  CreateAssessmentResponse,
  ElectricalPanel,
  EvCharger,
  HomeInformation,
  PersonalDetails,
  SurveyStepNumber,
  VehicleDetails,
} from "@/types/assessment";
import { reviewStepNumber } from "@/types/assessment";
import {
  chargerInstallationSchema,
  electricalPanelSchema,
  evChargerSchema,
  homeInformationSchema,
  personalDetailsSchema,
  vehicleDetailsSchema,
} from "@/validation/assessment";

type DraftCredentials = {
  assessmentId: string;
  resumeToken: string;
};

type FlowState = "loading" | "ready" | "success" | "error";

const storageKey = "home-charging-assessment:draft";

function formResolver<T extends FieldValues>(
  schema: Parameters<typeof zodResolver>[0],
) {
  return zodResolver(schema) as unknown as Resolver<T>;
}

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

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ?? "The request could not be completed.";
    throw new Error(message);
  }

  return payload as T;
}

function readStoredDraft(): DraftCredentials | null {
  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as DraftCredentials;

    if (parsed.assessmentId && parsed.resumeToken) {
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }

  return null;
}

function persistDraft(credentials: DraftCredentials) {
  window.localStorage.setItem(storageKey, JSON.stringify(credentials));
  window.history.replaceState(
    null,
    "",
    `/assessment?assessmentId=${credentials.assessmentId}&resumeToken=${credentials.resumeToken}`,
  );
}

function removeStoredDraft() {
  window.localStorage.removeItem(storageKey);
}

function readDraftFromUrl(): DraftCredentials | null {
  const params = new URLSearchParams(window.location.search);
  const assessmentId = params.get("assessmentId");
  const resumeToken = params.get("resumeToken");

  if (!assessmentId || !resumeToken) {
    return null;
  }

  return { assessmentId, resumeToken };
}

export function AssessmentFlow() {
  const initializedRef = useRef(false);
  const [flowState, setFlowState] = useState<FlowState>("loading");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [credentials, setCredentials] = useState<DraftCredentials | null>(null);
  const [activeStep, setActiveStep] = useState<
    SurveyStepNumber | typeof reviewStepNumber
  >(1);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sections = assessment?.sections ?? {};

  const startNewAssessment = useCallback(async () => {
    setFlowState("loading");
    setMessage(null);
    setErrorMessage(null);
    removeStoredDraft();

    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
      });
      const payload = await readApiResponse<CreateAssessmentResponse>(response);
      const nextCredentials = {
        assessmentId: payload.assessment.id,
        resumeToken: payload.resumeToken,
      };

      setCredentials(nextCredentials);
      setAssessment(payload.assessment);
      setActiveStep(payload.assessment.currentStep);
      persistDraft(nextCredentials);
      setFlowState("ready");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The assessment could not be started.",
      );
      setFlowState("error");
    }
  }, []);

  const initializeAssessment = useCallback(async () => {
    setFlowState("loading");
    setErrorMessage(null);

    const existingDraft = readDraftFromUrl() ?? readStoredDraft();

    if (existingDraft) {
      try {
        const response = await fetch(
          `/api/assessments/${existingDraft.assessmentId}`,
          {
            headers: {
              "x-resume-token": existingDraft.resumeToken,
            },
          },
        );
        const payload = await readApiResponse<AssessmentResponse>(response);

        setCredentials(existingDraft);
        setAssessment(payload.assessment);
        setActiveStep(payload.assessment.currentStep);
        persistDraft(existingDraft);
        setFlowState(
          payload.assessment.status === "completed" ? "success" : "ready",
        );
        return;
      } catch (error) {
        removeStoredDraft();
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The saved assessment could not be restored.",
        );
        setFlowState("error");
        return;
      }
    }

    await startNewAssessment();
  }, [startNewAssessment]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    void initializeAssessment();
  }, [initializeAssessment]);

  async function saveStep(step: SurveyStepNumber, data: unknown) {
    if (!credentials) {
      setErrorMessage("Assessment credentials are missing.");
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
            resumeToken: credentials.resumeToken,
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
      setErrorMessage("Assessment credentials are missing.");
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
          body: JSON.stringify({
            resumeToken: credentials.resumeToken,
          }),
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
    setActiveStep((currentStep) => {
      if (currentStep <= 1) {
        return 1;
      }

      return (currentStep - 1) as SurveyStepNumber;
    });
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

function ProgressIndicator({
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
            step.number <= lastCompletedStep + 1 ||
            (step.number === reviewStepNumber && lastCompletedStep >= 6);

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

function PersonalDetailsStep({
  defaultValues,
  isSaving,
  onSave,
}: {
  defaultValues?: PersonalDetails;
  isSaving: boolean;
  onSave: (data: PersonalDetails) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalDetails>({
    resolver: formResolver<PersonalDetails>(personalDetailsSchema),
    defaultValues: defaultValues ?? {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
    },
    mode: "onBlur",
  });

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <StepHeader
        title="Personal details"
        description="Tell us who the installation request is for."
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <TextInput
          label="First name"
          error={errors.firstName?.message}
          inputProps={register("firstName")}
        />
        <TextInput
          label="Last name"
          error={errors.lastName?.message}
          inputProps={register("lastName")}
        />
        <TextInput
          label="Email"
          type="email"
          error={errors.email?.message}
          inputProps={register("email")}
        />
        <TextInput
          label="Phone number"
          type="tel"
          error={errors.phoneNumber?.message}
          inputProps={register("phoneNumber")}
        />
      </div>
      <StepActions isSaving={isSaving} />
    </form>
  );
}

function VehicleDetailsStep({
  defaultValues,
  isSaving,
  onBack,
  onSave,
}: {
  defaultValues?: VehicleDetails;
  isSaving: boolean;
  onBack: () => void;
  onSave: (data: VehicleDetails) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<VehicleDetails>({
    resolver: formResolver<VehicleDetails>(vehicleDetailsSchema),
    defaultValues: defaultValues ?? {
      manufacturer: "",
      model: "",
      year: undefined as unknown as number,
    },
    mode: "onBlur",
  });
  const manufacturer = useWatch({ control, name: "manufacturer" }) ?? "";
  const model = useWatch({ control, name: "model" }) ?? "";
  const models = getVehicleModels(manufacturer);
  const years = getVehicleYears(manufacturer, model);
  const manufacturerField = register("manufacturer");
  const modelField = register("model");

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <StepHeader
        title="Vehicle details"
        description="Choose the vehicle so the charger requirements can be reviewed later."
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <SelectInput
          label="Manufacturer"
          error={errors.manufacturer?.message}
          inputProps={{
            ...manufacturerField,
            onChange: (event) => {
              void manufacturerField.onChange(event);
              setValue("model", "");
              setValue("year", undefined as unknown as number);
            },
          }}
        >
          <option value="">Select manufacturer</option>
          {vehicleCatalog.map((entry) => (
            <option key={entry.manufacturer} value={entry.manufacturer}>
              {entry.manufacturer}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          label="Model"
          error={errors.model?.message}
          inputProps={{
            ...modelField,
            disabled: !manufacturer,
            onChange: (event) => {
              void modelField.onChange(event);
              setValue("year", undefined as unknown as number);
            },
          }}
        >
          <option value="">Select model</option>
          {models.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          label="Year"
          error={errors.year?.message}
          inputProps={{
            ...register("year", { valueAsNumber: true }),
            disabled: !model,
          }}
        >
          <option value="">Select year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </SelectInput>
      </div>
      <StepActions isSaving={isSaving} onBack={onBack} />
    </form>
  );
}

function ElectricalPanelStep({
  defaultValues,
  isSaving,
  onBack,
  onSave,
}: {
  defaultValues?: ElectricalPanel;
  isSaving: boolean;
  onBack: () => void;
  onSave: (data: ElectricalPanel) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ElectricalPanel>({
    resolver: formResolver<ElectricalPanel>(electricalPanelSchema),
    defaultValues: defaultValues ?? {
      panelLocation: "",
      mainBreakerCapacity: undefined as unknown as number,
      availableSlots: undefined as unknown as number,
    },
    mode: "onBlur",
  });

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <StepHeader
        title="Electrical panel"
        description="Provide the basic panel information available to you."
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <TextInput
          label="Panel location"
          error={errors.panelLocation?.message}
          inputProps={register("panelLocation")}
        />
        <TextInput
          label="Main breaker capacity"
          type="number"
          min="0"
          step="1"
          error={errors.mainBreakerCapacity?.message}
          inputProps={register("mainBreakerCapacity", { valueAsNumber: true })}
        />
        <TextInput
          label="Number of available slots"
          type="number"
          min="0"
          step="1"
          error={errors.availableSlots?.message}
          inputProps={register("availableSlots", { valueAsNumber: true })}
        />
      </div>
      <StepActions isSaving={isSaving} onBack={onBack} />
    </form>
  );
}

function ChargerInstallationStep({
  defaultValues,
  isSaving,
  onBack,
  onSave,
}: {
  defaultValues?: ChargerInstallation;
  isSaving: boolean;
  onBack: () => void;
  onSave: (data: ChargerInstallation) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChargerInstallation>({
    resolver: formResolver<ChargerInstallation>(chargerInstallationSchema),
    defaultValues: defaultValues ?? {
      proposedChargerLocation: "",
      distanceFromPanel: undefined as unknown as number,
    },
    mode: "onBlur",
  });

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <StepHeader
        title="Charger installation"
        description="Describe where the charger should be installed."
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <TextInput
          label="Proposed charger location"
          error={errors.proposedChargerLocation?.message}
          inputProps={register("proposedChargerLocation")}
        />
        <TextInput
          label="Distance from the electrical panel"
          type="number"
          min="0"
          step="0.1"
          error={errors.distanceFromPanel?.message}
          inputProps={register("distanceFromPanel", { valueAsNumber: true })}
        />
      </div>
      <StepActions isSaving={isSaving} onBack={onBack} />
    </form>
  );
}

function HomeInformationStep({
  defaultValues,
  isSaving,
  onBack,
  onSave,
}: {
  defaultValues?: HomeInformation;
  isSaving: boolean;
  onBack: () => void;
  onSave: (data: HomeInformation) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HomeInformation>({
    resolver: formResolver<HomeInformation>(homeInformationSchema),
    defaultValues: defaultValues ?? {
      address: "",
      majorAppliances: [],
    },
    mode: "onBlur",
  });

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <StepHeader
        title="Home information"
        description="Share the installation address and major energy-consuming appliances."
      />
      <div className="mt-6 grid gap-6">
        <TextAreaInput
          label="Address"
          error={errors.address?.message}
          inputProps={register("address")}
        />
        <fieldset>
          <legend className="text-sm font-semibold text-neutral-900">
            Major energy-consuming appliances
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {majorApplianceOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-800"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
                  {...register("majorAppliances")}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {errors.majorAppliances?.message ? (
            <p className="mt-2 text-sm font-medium text-red-700">
              {errors.majorAppliances.message}
            </p>
          ) : null}
        </fieldset>
      </div>
      <StepActions isSaving={isSaving} onBack={onBack} />
    </form>
  );
}

function EvChargerStep({
  defaultValues,
  isSaving,
  onBack,
  onSave,
}: {
  defaultValues?: EvCharger;
  isSaving: boolean;
  onBack: () => void;
  onSave: (data: EvCharger) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<EvCharger>({
    resolver: formResolver<EvCharger>(evChargerSchema),
    defaultValues: defaultValues ?? {
      wantsToPurchaseCharger: false,
      chargerBrand: "",
      chargerModel: "",
    },
    mode: "onBlur",
  });
  const wantsToPurchaseCharger =
    useWatch({ control, name: "wantsToPurchaseCharger" }) ?? false;
  const chargerBrand = useWatch({ control, name: "chargerBrand" }) ?? "";
  const chargerModels = getChargerModels(chargerBrand);
  const chargerBrandField = register("chargerBrand");

  useEffect(() => {
    if (!wantsToPurchaseCharger) {
      setValue("chargerBrand", "");
      setValue("chargerModel", "");
    }
  }, [setValue, wantsToPurchaseCharger]);

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <StepHeader
        title="EV charger"
        description="Purchasing a charger is optional. Completing the assessment submits the installation request."
      />
      <div className="mt-6 grid gap-5">
        <label className="flex items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-800">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
            {...register("wantsToPurchaseCharger")}
          />
          <span>I want to purchase an EV charger with this installation.</span>
        </label>

        {wantsToPurchaseCharger ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectInput
              label="Charger brand"
              error={errors.chargerBrand?.message}
              inputProps={{
                ...chargerBrandField,
                onChange: (event) => {
                  void chargerBrandField.onChange(event);
                  setValue("chargerModel", "");
                },
              }}
            >
              <option value="">Select charger brand</option>
              {chargerCatalog.map((entry) => (
                <option key={entry.brand} value={entry.brand}>
                  {entry.brand}
                </option>
              ))}
            </SelectInput>
            <SelectInput
              label="Charger model"
              error={errors.chargerModel?.message}
              inputProps={{
                ...register("chargerModel"),
                disabled: !chargerBrand,
              }}
            >
              <option value="">Select charger model</option>
              {chargerModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </SelectInput>
          </div>
        ) : null}
      </div>
      <StepActions isSaving={isSaving} onBack={onBack} />
    </form>
  );
}

function ReviewStep({
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

function StatusPanel({
  children,
  message,
  title,
}: {
  children?: React.ReactNode;
  message: string;
  title: string;
}) {
  return (
    <section className="mx-auto mt-20 max-w-xl rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase text-emerald-700">
        Home Charging Assessment
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-neutral-950">{title}</h1>
      <p className="mt-4 text-base leading-7 text-neutral-700">{message}</p>
      {children}
    </section>
  );
}

function StepHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
        {description}
      </p>
    </div>
  );
}

function StepActions({
  isSaving,
  onBack,
}: {
  isSaving: boolean;
  onBack?: () => void;
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:ring-offset-2"
        >
          Previous
        </button>
      ) : (
        <span />
      )}
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-md bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save and continue"}
      </button>
    </div>
  );
}

function TextInput({
  error,
  inputProps,
  label,
  min,
  step,
  type = "text",
}: {
  error?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  label: string;
  min?: string;
  step?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <input
        {...inputProps}
        type={type}
        min={min}
        step={step}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        aria-invalid={error ? "true" : "false"}
      />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function TextAreaInput({
  error,
  inputProps,
  label,
}: {
  error?: string;
  inputProps: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <textarea
        {...inputProps}
        rows={3}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        aria-invalid={error ? "true" : "false"}
      />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function SelectInput({
  children,
  error,
  inputProps,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  inputProps: React.SelectHTMLAttributes<HTMLSelectElement>;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <select
        {...inputProps}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
        aria-invalid={error ? "true" : "false"}
      >
        {children}
      </select>
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="mt-2 text-sm font-medium text-red-700">{message}</p>;
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
              {isEmptyReviewValue(value) ? (
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

function isEmptyReviewValue(value: React.ReactNode) {
  return value === undefined || value === null || value === "";
}
