import { z } from "zod";
import {
  chargerCatalog,
  getChargerModels,
  getVehicleModels,
  getVehicleYears,
  majorApplianceValues,
  vehicleCatalog,
} from "@/lib/catalogs";
import { surveyStepNumbers, type SurveyStepNumber } from "@/types/assessment";

const phonePattern = /^\+?[\d\s().-]{7,20}$/;
const objectIdPattern = /^[a-f\d]{24}$/i;

const requiredText = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required.`);

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const numberInput = (fieldName: string) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() === "") {
        return undefined;
      }

      if (typeof value === "number") {
        return Number.isNaN(value) ? undefined : value;
      }

      const numericValue = Number(value);

      return Number.isNaN(numericValue) ? value : numericValue;
    },
    z
      .number({ error: `${fieldName} is required.` })
      .finite(`${fieldName} must be a valid number.`)
      .min(0, `${fieldName} cannot be negative.`),
  );

const integerInput = (fieldName: string) =>
  numberInput(fieldName).pipe(
    z.number().int(`${fieldName} must be a whole number.`),
  );

const manufacturerNames = vehicleCatalog.map((entry) => entry.manufacturer);
const chargerBrands = chargerCatalog.map((entry) => entry.brand);
export const authorizationSchema = z.object({
  resumeToken: z.string().min(32, "A valid resume token is required."),
});

export const assessmentIdSchema = z
  .string()
  .regex(objectIdPattern, "A valid assessment id is required.");

export const personalDetailsSchema = z.object({
  firstName: requiredText("First name"),
  lastName: requiredText("Last name"),
  email: requiredText("Email").email("Enter a valid email address."),
  phoneNumber: requiredText("Phone number").regex(
    phonePattern,
    "Enter a valid phone number.",
  ),
});

export const vehicleDetailsSchema = z
  .object({
    manufacturer: requiredText("Manufacturer"),
    model: requiredText("Model"),
    year: integerInput("Year"),
  })
  .superRefine((value, context) => {
    if (!manufacturerNames.includes(value.manufacturer)) {
      context.addIssue({
        code: "custom",
        message: "Choose a listed manufacturer.",
        path: ["manufacturer"],
      });
      return;
    }

    const modelNames = getVehicleModels(value.manufacturer).map(
      (model) => model.name,
    );

    if (!modelNames.includes(value.model)) {
      context.addIssue({
        code: "custom",
        message: "Choose a listed model for the selected manufacturer.",
        path: ["model"],
      });
      return;
    }

    if (!getVehicleYears(value.manufacturer, value.model).includes(value.year)) {
      context.addIssue({
        code: "custom",
        message: "Choose a listed year for the selected model.",
        path: ["year"],
      });
    }
  });

export const electricalPanelSchema = z.object({
  panelLocation: requiredText("Panel location"),
  mainBreakerCapacity: numberInput("Main breaker capacity"),
  availableSlots: integerInput("Number of available slots"),
});

export const chargerInstallationSchema = z.object({
  proposedChargerLocation: requiredText("Proposed charger location"),
  distanceFromPanel: numberInput("Distance from the electrical panel"),
});

export const homeInformationSchema = z.object({
  address: requiredText("Address"),
  majorAppliances: z
    .array(z.enum(majorApplianceValues))
    .min(1, "Select at least one option."),
});

export const evChargerSchema = z
  .object({
    wantsToPurchaseCharger: z.boolean(),
    chargerBrand: optionalText,
    chargerModel: optionalText,
  })
  .superRefine((value, context) => {
    if (!value.wantsToPurchaseCharger) {
      return;
    }

    if (!value.chargerBrand) {
      context.addIssue({
        code: "custom",
        message: "Charger brand is required when purchasing a charger.",
        path: ["chargerBrand"],
      });
      return;
    }

    if (!chargerBrands.includes(value.chargerBrand)) {
      context.addIssue({
        code: "custom",
        message: "Choose a listed charger brand.",
        path: ["chargerBrand"],
      });
      return;
    }

    if (!value.chargerModel) {
      context.addIssue({
        code: "custom",
        message: "Charger model is required when purchasing a charger.",
        path: ["chargerModel"],
      });
      return;
    }

    if (!getChargerModels(value.chargerBrand).includes(value.chargerModel)) {
      context.addIssue({
        code: "custom",
        message: "Choose a listed charger model for the selected brand.",
        path: ["chargerModel"],
      });
    }
  });

export const assessmentSectionsSchema = z.object({
  personalDetails: personalDetailsSchema,
  vehicleDetails: vehicleDetailsSchema,
  electricalPanel: electricalPanelSchema,
  chargerInstallation: chargerInstallationSchema,
  homeInformation: homeInformationSchema,
  evCharger: evChargerSchema,
});

export const saveStepRouteParamsSchema = z.object({
  assessmentId: assessmentIdSchema,
  step: z.coerce
    .number()
    .int()
    .refine(
      (step): step is SurveyStepNumber =>
        surveyStepNumbers.includes(step as SurveyStepNumber),
      "A valid survey step is required.",
    ),
});

export const assessmentRouteParamsSchema = z.object({
  assessmentId: assessmentIdSchema,
});

export const saveStepRequestSchema = authorizationSchema.extend({
  data: z.unknown(),
});

export const completeAssessmentRequestSchema = authorizationSchema;

export function getSurveyStepSchema(step: SurveyStepNumber) {
  switch (step) {
    case 1:
      return personalDetailsSchema;
    case 2:
      return vehicleDetailsSchema;
    case 3:
      return electricalPanelSchema;
    case 4:
      return chargerInstallationSchema;
    case 5:
      return homeInformationSchema;
    case 6:
      return evChargerSchema;
  }
}
