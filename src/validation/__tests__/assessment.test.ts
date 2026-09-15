import { describe, expect, it } from "vitest";
import {
  assessmentSectionsSchema,
  chargerInstallationSchema,
  electricalPanelSchema,
  evChargerSchema,
  homeInformationSchema,
  personalDetailsSchema,
  vehicleDetailsSchema,
} from "@/validation/assessment";
import { adminAssessmentUpdateSchema } from "@/validation/admin";

const validSections = {
  personalDetails: {
    firstName: "Alex",
    lastName: "Rivera",
    email: "alex@example.com",
    phoneNumber: "+1 555 123 4567",
  },
  vehicleDetails: {
    manufacturer: "Tesla",
    model: "Model 3",
    year: 2024,
  },
  electricalPanel: {
    panelLocation: "Garage",
    mainBreakerCapacity: 200,
    availableSlots: 4,
  },
  chargerInstallation: {
    proposedChargerLocation: "Inside garage",
    distanceFromPanel: 20,
  },
  homeInformation: {
    address: "100 Main Street",
    majorAppliances: ["water_heater"],
  },
  evCharger: {
    wantsToPurchaseCharger: true,
    chargerBrand: "ChargePoint",
    chargerModel: "Home Flex",
  },
};

describe("assessment validation", () => {
  it("accepts a complete valid assessment", () => {
    expect(assessmentSectionsSchema.parse(validSections)).toEqual(validSections);
  });

  it("rejects invalid customer email addresses", () => {
    expect(() =>
      personalDetailsSchema.parse({
        ...validSections.personalDetails,
        email: "not-an-email",
      }),
    ).toThrow();
  });

  it("requires a charger model when purchasing a charger", () => {
    expect(() =>
      evChargerSchema.parse({
        wantsToPurchaseCharger: true,
        chargerBrand: "ChargePoint",
      }),
    ).toThrow();
  });

  const maxEmail = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
  const textBoundaries = [
    { name: "first name", schema: personalDetailsSchema.shape.firstName, value: "a".repeat(100) },
    { name: "last name", schema: personalDetailsSchema.shape.lastName, value: "a".repeat(100) },
    { name: "email", schema: personalDetailsSchema.shape.email, value: maxEmail },
    { name: "manufacturer", schema: vehicleDetailsSchema.shape.manufacturer, value: "a".repeat(100) },
    { name: "vehicle model", schema: vehicleDetailsSchema.shape.model, value: "a".repeat(100) },
    { name: "panel location", schema: electricalPanelSchema.shape.panelLocation, value: "a".repeat(200) },
    { name: "charger location", schema: chargerInstallationSchema.shape.proposedChargerLocation, value: "a".repeat(200) },
    { name: "address", schema: homeInformationSchema.shape.address, value: "a".repeat(500) },
    { name: "charger brand", schema: evChargerSchema.shape.chargerBrand, value: "a".repeat(100) },
    { name: "charger model", schema: evChargerSchema.shape.chargerModel, value: "a".repeat(100) },
  ];

  it.each(textBoundaries)("accepts $name at its text limit and still trims whitespace", ({ schema, value }) => {
    expect(schema.parse(` ${value} `)).toBe(value);
  });

  it.each(textBoundaries)("rejects $name above its text limit without truncating", ({ schema, value }) => {
    const result = schema.safeParse(`a${value}`);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({ code: "too_big" }));
    }
  });

  it("retains the stricter phone pattern as well as the 30-character text limit", () => {
    const phone = personalDetailsSchema.shape.phoneNumber;

    expect(phone.parse(`+${"1".repeat(20)}`)).toBe(`+${"1".repeat(20)}`);
    expect(phone.safeParse(`+${"1".repeat(21)}`).success).toBe(false);
    const result = phone.safeParse("1".repeat(31));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({ code: "too_big", maximum: 30 }));
    }
  });

  it("validates catalog text structure independently of database membership", () => {
    expect(vehicleDetailsSchema.safeParse({
      ...validSections.vehicleDetails,
      manufacturer: "a".repeat(100),
    }).success).toBe(true);
    expect(vehicleDetailsSchema.safeParse({
      ...validSections.vehicleDetails,
      model: "a".repeat(100),
    }).success).toBe(true);
    expect(evChargerSchema.safeParse({
      wantsToPurchaseCharger: true,
      chargerBrand: "a".repeat(100),
      chargerModel: "a".repeat(100),
    }).success).toBe(true);
  });

  it("bounds optional charger text even when not purchasing and preserves blank handling", () => {
    expect(evChargerSchema.parse({
      wantsToPurchaseCharger: false,
      chargerBrand: " ",
      chargerModel: " ",
    })).toEqual({ wantsToPurchaseCharger: false, chargerBrand: undefined, chargerModel: undefined });
    expect(evChargerSchema.safeParse({
      wantsToPurchaseCharger: false,
      chargerBrand: "a".repeat(100),
      chargerModel: "a".repeat(100),
    }).success).toBe(true);
    expect(evChargerSchema.safeParse({
      wantsToPurchaseCharger: false,
      chargerBrand: "a".repeat(101),
      chargerModel: "a".repeat(101),
    }).success).toBe(false);
  });

  it("accepts existing valid contact data in the shared admin schema", () => {
    expect(adminAssessmentUpdateSchema.parse(validSections.personalDetails)).toEqual(validSections.personalDetails);
  });

  it.each([
    { field: "firstName", value: "a".repeat(100) },
    { field: "lastName", value: "a".repeat(100) },
    { field: "email", value: maxEmail },
    { field: "phoneNumber", value: `+${"1".repeat(20)}` },
    { field: "adminNotes", value: "a".repeat(5000) },
  ])("enforces the admin $field boundary", ({ field, value }) => {
    expect(adminAssessmentUpdateSchema.safeParse({ [field]: value }).success).toBe(true);
    const aboveLimit = `${value}${field === "phoneNumber" ? "1" : "a"}`;
    expect(adminAssessmentUpdateSchema.safeParse({ [field]: aboveLimit }).success).toBe(false);
  });

  it.each([
    {},
    { firstName: " " },
    { lastName: " " },
    { email: "not-an-email" },
    { phoneNumber: "not-a-phone" },
    { status: "completed" },
    { sections: { personalDetails: validSections.personalDetails } },
  ])("rejects invalid admin form data: %j", (data) => {
    expect(adminAssessmentUpdateSchema.safeParse(data).success).toBe(false);
  });

  it("accepts notes-only updates including clearing notes", () => {
    expect(adminAssessmentUpdateSchema.parse({ adminNotes: " Notes " })).toEqual({ adminNotes: "Notes" });
    expect(adminAssessmentUpdateSchema.parse({ adminNotes: " " })).toEqual({ adminNotes: "" });
  });
});
