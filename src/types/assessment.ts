export const surveyStepNumbers = [1, 2, 3, 4, 5, 6] as const;
export const reviewStepNumber = 7;

export type SurveyStepNumber = (typeof surveyStepNumbers)[number];
export type AssessmentStepNumber = SurveyStepNumber | typeof reviewStepNumber;
export type AssessmentStatus = "draft" | "completed";

export type SurveyStepKey =
  | "personalDetails"
  | "vehicleDetails"
  | "electricalPanel"
  | "chargerInstallation"
  | "homeInformation"
  | "evCharger";

export type MajorAppliance =
  | "water_heater"
  | "air_conditioner"
  | "electric_heating"
  | "electric_dryer"
  | "pool_pump"
  | "other";

export type PersonalDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
};

export type VehicleDetails = {
  manufacturer: string;
  model: string;
  year: number;
};

export type ElectricalPanel = {
  panelLocation: string;
  mainBreakerCapacity: number;
  availableSlots: number;
};

export type ChargerInstallation = {
  proposedChargerLocation: string;
  distanceFromPanel: number;
};

export type HomeInformation = {
  address: string;
  majorAppliances: MajorAppliance[];
};

export type EvCharger = {
  wantsToPurchaseCharger: boolean;
  chargerBrand?: string;
  chargerModel?: string;
};

export type AssessmentSections = Partial<{
  personalDetails: PersonalDetails;
  vehicleDetails: VehicleDetails;
  electricalPanel: ElectricalPanel;
  chargerInstallation: ChargerInstallation;
  homeInformation: HomeInformation;
  evCharger: EvCharger;
}>;

export type Assessment = {
  id: string;
  status: AssessmentStatus;
  currentStep: AssessmentStepNumber;
  lastCompletedStep: number;
  sections: AssessmentSections;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  completedAt?: string;
};

export type CreateAssessmentResponse = {
  assessment: Assessment;
  resumeToken: string;
};

export type AssessmentResponse = {
  assessment: Assessment;
};
