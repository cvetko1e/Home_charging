import { Children, isValidElement, type FormHTMLAttributes, type ReactElement, type SubmitEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { UseFormProps } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChargerCatalog, useVehicleCatalog } from "@/hooks/use-catalogs";
import { SelectInput } from "@/components/ui/SelectInput";
import { VehicleDetailsStep } from "../steps/VehicleDetailsStep";
import { EvChargerStep } from "../steps/EvChargerStep";

const mocks = vi.hoisted(() => ({ setValue: vi.fn() }));
vi.mock("@/hooks/use-catalogs", () => ({ useVehicleCatalog: vi.fn(), useChargerCatalog: vi.fn() }));
vi.mock("react-hook-form", async (importOriginal) => {
  const rhf = await importOriginal<typeof import("react-hook-form")>();
  return { ...rhf, useForm: (options: UseFormProps) => {
    const form = rhf.useForm(options);
    return { ...form, setValue: (...args: Parameters<typeof form.setValue>) => {
      mocks.setValue(...args);
      form.setValue(...args);
    } };
  } };
});

const vehicle = { manufacturer: "Database Vehicle", model: "Model One", year: 2028 };
const charger = { wantsToPurchaseCharger: true, chargerBrand: "Database Brand", chargerModel: "Charger One" };
const vehicles = [{ manufacturer: vehicle.manufacturer, models: [{ name: vehicle.model, years: [vehicle.year] }] }];
const chargers = [{ brand: charger.chargerBrand, models: [charger.chargerModel] }];
type FormElement = ReactElement<FormHTMLAttributes<HTMLFormElement>>;

function renderForm(render: () => FormElement) {
  let form: FormElement | undefined;
  function Capture() { form = render(); return form; }
  const html = renderToStaticMarkup(<Capture />);
  return {
    html, form: form!,
    submit: () => form?.props.onSubmit?.({ preventDefault: vi.fn(), persist: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>),
  };
}

function selectProps(node: ReactElement<{ children?: React.ReactNode }>, label: string): Parameters<typeof SelectInput>[0] | undefined {
  for (const child of Children.toArray(node.props.children)) {
    if (!isValidElement(child)) continue;
    if (child.type === SelectInput && (child.props as { label: string }).label === label) return child.props as Parameters<typeof SelectInput>[0];
    const nested = selectProps(child as ReactElement<{ children?: React.ReactNode }>, label);
    if (nested) return nested;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useVehicleCatalog).mockReturnValue({ state: { status: "ready", data: { vehicles } }, retry: vi.fn() });
  vi.mocked(useChargerCatalog).mockReturnValue({ state: { status: "ready", data: { chargers } }, retry: vi.fn() });
});

describe.each(["vehicle", "charger"] as const)("%s catalog dropdown", (kind) => {
  function step(onSave: (data: unknown) => void): FormElement {
    const props = { isSaving: false, onBack: vi.fn(), onSave };
    return kind === "vehicle" ? VehicleDetailsStep({ ...props, defaultValues: vehicle }) : EvChargerStep({ ...props, defaultValues: charger });
  }

  it("renders database-only options and retains saved selections and answer format", async () => {
    const onSave = vi.fn();
    const view = renderForm(() => step(onSave));
    expect(view.html).toContain(kind === "vehicle" ? vehicle.manufacturer : charger.chargerBrand);
    expect(view.html).toContain(kind === "vehicle" ? vehicle.model : charger.chargerModel);
    expect(view.html).toContain('selected=""');
    await view.submit();
    expect(onSave).toHaveBeenCalledExactlyOnceWith(kind === "vehicle" ? vehicle : charger);
  });

  it.each(["loading", "error"] as const)("preserves saved answers while %s and blocks submission", async (status) => {
    const state = status === "loading" ? { status } : { status, message: "Catalog unavailable. Please try again." };
    if (kind === "vehicle") vi.mocked(useVehicleCatalog).mockReturnValue({ state, retry: vi.fn() });
    else vi.mocked(useChargerCatalog).mockReturnValue({ state, retry: vi.fn() });
    const onSave = vi.fn();
    const view = renderForm(() => step(onSave));
    expect(view.html).toContain(status === "loading" ? 'role="status"' : 'role="alert"');
    expect(view.html).toContain(status === "loading" ? "Loading" : "Try again");
    expect(view.html).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
    expect(view.html).toContain(kind === "vehicle" ? vehicle.model : charger.chargerModel);
    await view.submit();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows historical selections without silently clearing or accepting removed options", async () => {
    if (kind === "vehicle") vi.mocked(useVehicleCatalog).mockReturnValue({ state: { status: "ready", data: { vehicles: [{ manufacturer: "Other", models: [{ name: "Other", years: [2030] }] }] } }, retry: vi.fn() });
    else vi.mocked(useChargerCatalog).mockReturnValue({ state: { status: "ready", data: { chargers: [{ brand: "Other", models: ["Other"] }] } }, retry: vi.fn() });
    const onSave = vi.fn();
    const view = renderForm(() => step(onSave));
    expect(view.html).toContain(kind === "vehicle" ? vehicle.model : charger.chargerModel);
    expect(mocks.setValue).not.toHaveBeenCalled();
    await view.submit();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("dependent selection resets", () => {
  it("clears model and year only when manufacturer changes, and year when model changes", () => {
    const { form } = renderForm(() => VehicleDetailsStep({ defaultValues: vehicle, isSaving: false, onBack: vi.fn(), onSave: vi.fn() }));
    expect(mocks.setValue).not.toHaveBeenCalled();
    selectProps(form, "Manufacturer")?.inputProps.onChange?.({ target: { name: "manufacturer", value: "Other" } } as React.ChangeEvent<HTMLSelectElement>);
    expect(mocks.setValue.mock.calls).toEqual([["model", ""], ["year", undefined]]);
    mocks.setValue.mockClear();
    selectProps(form, "Model")?.inputProps.onChange?.({ target: { name: "model", value: "Other" } } as React.ChangeEvent<HTMLSelectElement>);
    expect(mocks.setValue.mock.calls).toEqual([["year", undefined]]);
  });

  it("clears the charger model when the brand changes", () => {
    const { form } = renderForm(() => EvChargerStep({ defaultValues: charger, isSaving: false, onBack: vi.fn(), onSave: vi.fn() }));
    selectProps(form, "Charger brand")?.inputProps.onChange?.({ target: { name: "chargerBrand", value: "Other" } } as React.ChangeEvent<HTMLSelectElement>);
    expect(mocks.setValue.mock.calls).toEqual([["chargerModel", ""]]);
  });

  it("allows a non-purchase without a usable charger catalog", async () => {
    vi.mocked(useChargerCatalog).mockReturnValue({ state: { status: "error", message: "Unavailable" }, retry: vi.fn() });
    const onSave = vi.fn();
    const view = renderForm(() => EvChargerStep({ defaultValues: { wantsToPurchaseCharger: false }, isSaving: false, onBack: vi.fn(), onSave }));
    expect(view.html).not.toContain('role="alert"');
    await view.submit();
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ wantsToPurchaseCharger: false });
  });
});
