import { z } from "zod";
import { phonePattern } from "@/validation/assessment";

const optionalQueryText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.date().optional(),
);

const editableName = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required.`);

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export const adminAssessmentUpdateSchema = z
  .object({
    firstName: editableName("First name").optional(),
    lastName: editableName("Last name").optional(),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .toLowerCase()
      .optional(),
    phoneNumber: z
      .string()
      .trim()
      .regex(phonePattern, "Enter a valid phone number.")
      .optional(),
    adminNotes: z.string().trim().max(5000, "Admin notes are too long.").optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required.",
  });

export const assessmentSortFieldSchema = z.enum([
  "createdAt",
  "lastActivityAt",
  "status",
  "lastCompletedStep",
  "customerName",
  "vehicle",
]);

export const assessmentSortDirectionSchema = z.enum(["asc", "desc"]);

export const assessmentListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
    sort: assessmentSortFieldSchema.default("lastActivityAt"),
    direction: assessmentSortDirectionSchema.default("desc"),
    search: optionalQueryText,
    status: z.enum(["draft", "completed"]).optional(),
    createdFrom: optionalDate,
    createdTo: optionalDate,
    lastCompletedStep: z.coerce.number().int().min(0).max(7).optional(),
    customerName: optionalQueryText,
    email: optionalQueryText,
    vehicleManufacturer: optionalQueryText,
    vehicleModel: optionalQueryText,
    chargerPurchase: z.enum(["yes", "no"]).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.createdFrom &&
      value.createdTo &&
      value.createdFrom.getTime() > value.createdTo.getTime()
    ) {
      context.addIssue({
        code: "custom",
        message: "Creation start date must be before the end date.",
        path: ["createdFrom"],
      });
    }
  });

export type AssessmentListQuery = z.infer<typeof assessmentListQuerySchema>;
export type AdminAssessmentUpdateInput = z.infer<
  typeof adminAssessmentUpdateSchema
>;
