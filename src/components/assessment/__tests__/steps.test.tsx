import type { FormHTMLAttributes, ReactElement, SubmitEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PersonalDetailsStep } from "../steps/PersonalDetailsStep";
import { VehicleDetailsStep } from "../steps/VehicleDetailsStep";
import { ElectricalPanelStep } from "../steps/ElectricalPanelStep";
import { ChargerInstallationStep } from "../steps/ChargerInstallationStep";
import { HomeInformationStep } from "../steps/HomeInformationStep";
import { EvChargerStep } from "../steps/EvChargerStep";

type FormElement = ReactElement<FormHTMLAttributes<HTMLFormElement>>;
type StepCase = {
  name: string;
  title: string;
  render: (onSave: (data: unknown) => void, valid: boolean) => FormElement;
  expected: unknown;
};

const personalDetails = { firstName: "Avery", lastName: "Stone", email: "avery@example.com", phoneNumber: "+1 555 123 4567" };
const vehicleDetails = { manufacturer: "Tesla", model: "Model 3", year: 2024 };
const panel = { panelLocation: "Garage", mainBreakerCapacity: 200, availableSlots: 0 };
const installation = { proposedChargerLocation: "Driveway wall", distanceFromPanel: 12.5 };
const stepProps = { isSaving: false, onBack: () => {} };

const steps: StepCase[] = [
  {
    name: "personal", title: "Personal details", expected: personalDetails,
    render: (onSave, valid) => PersonalDetailsStep({
      ...stepProps, onSave, defaultValues: { ...personalDetails, email: valid ? personalDetails.email : "invalid" },
    }),
  },
  {
    name: "vehicle", title: "Vehicle details", expected: vehicleDetails,
    render: (onSave, valid) => VehicleDetailsStep({
      ...stepProps, onSave, defaultValues: { ...vehicleDetails, model: valid ? vehicleDetails.model : "unlisted model" },
    }),
  },
  {
    name: "panel", title: "Electrical panel", expected: panel,
    render: (onSave, valid) => ElectricalPanelStep({
      ...stepProps, onSave, defaultValues: { ...panel, availableSlots: valid ? 0 : 1.5 },
    }),
  },
  {
    name: "installation", title: "Charger installation", expected: installation,
    render: (onSave, valid) => ChargerInstallationStep({
      ...stepProps, onSave, defaultValues: { ...installation, distanceFromPanel: valid ? 12.5 : -1 },
    }),
  },
  {
    name: "home", title: "Home information", expected: { address: "100 Main Street", majorAppliances: ["water_heater"] },
    render: (onSave, valid) => HomeInformationStep({
      ...stepProps, onSave, defaultValues: { address: "100 Main Street", majorAppliances: valid ? ["water_heater"] : [] },
    }),
  },
  {
    name: "charger", title: "EV charger", expected: { wantsToPurchaseCharger: false },
    render: (onSave, valid) => EvChargerStep({
      ...stepProps, onSave, defaultValues: { wantsToPurchaseCharger: !valid },
    }),
  },
];

function renderForm(render: () => FormElement) {
  let form: FormElement | undefined;
  function CaptureForm() {
    // Use React's real hook dispatcher and each step's real Zod resolver.
    form = render();
    return form;
  }
  const html = renderToStaticMarkup(<CaptureForm />);
  const submit = () => form?.props.onSubmit?.({
    preventDefault: vi.fn(), persist: vi.fn(),
  } as unknown as SubmitEvent<HTMLFormElement>);
  return { html, submit };
}

describe.each(steps)("$name survey step", ({ render, title, expected }) => {
  it("renders the existing English UI and saves validated answers", async () => {
    const onSave = vi.fn();
    const { html, submit } = renderForm(() => render(onSave, true));
    expect(html).toContain(title);
    expect(html).toContain("Save and continue");
    expect(html).toMatch(/novalidate/i);
    await submit();
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toEqual(expected);
  });

  it("rejects invalid answers before invoking the save callback", async () => {
    const onSave = vi.fn();
    await renderForm(() => render(onSave, false)).submit();
    expect(onSave).not.toHaveBeenCalled();
  });
});
