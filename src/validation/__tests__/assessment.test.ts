import { describe, expect, it } from "vitest";
import {
  assessmentSectionsSchema,
  evChargerSchema,
  personalDetailsSchema,
} from "@/validation/assessment";

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
});
