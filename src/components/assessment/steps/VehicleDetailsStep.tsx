"use client";

import { useForm, useWatch } from "react-hook-form";
import type { VehicleDetails } from "@/types/assessment";
import { createVehicleSelectionSchema } from "@/validation/catalogs";
import { formResolver } from "@/lib/form-resolver";
import { getVehicleModels, getVehicleYears } from "@/lib/catalogs";
import { useVehicleCatalog } from "@/hooks/use-catalogs";
import { CatalogStatus } from "../CatalogStatus";
import { SelectInput } from "@/components/ui/SelectInput";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import type { NavigableStepProps } from "./types";

export function VehicleDetailsStep({
  defaultValues,
  isSaving,
  onBack,
  onSave,
}: NavigableStepProps<VehicleDetails>) {
  const { state: catalog, retry } = useVehicleCatalog();
  const vehicleCatalog = catalog.status === "ready" ? catalog.data.vehicles : [];
  const catalogReady = catalog.status === "ready";
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<VehicleDetails>({
    resolver: formResolver<VehicleDetails>(createVehicleSelectionSchema(vehicleCatalog)),
    defaultValues: defaultValues ?? {
      manufacturer: "",
      model: "",
      year: undefined as unknown as number,
    },
    mode: "onBlur",
  });
  const manufacturer = useWatch({ control, name: "manufacturer" }) ?? "";
  const model = useWatch({ control, name: "model" }) ?? "";
  const year = useWatch({ control, name: "year" });
  const models = getVehicleModels(vehicleCatalog, manufacturer);
  const years = getVehicleYears(vehicleCatalog, manufacturer, model);
  const manufacturerField = register("manufacturer");
  const modelField = register("model");

  return (
    <form onSubmit={handleSubmit((data) => {
      if (catalogReady) return onSave(data);
    })} noValidate aria-busy={!catalogReady && catalog.status === "loading"}>
      <StepHeader
        title="Vehicle details"
        description="Choose the vehicle so the charger requirements can be reviewed later."
      />
      <CatalogStatus state={catalog} label="vehicles" onRetry={retry} />
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <SelectInput
          label="Manufacturer"
          error={errors.manufacturer?.message}
          inputProps={{
            ...manufacturerField,
            value: manufacturer,
            disabled: !catalogReady,
            onChange: (event) => {
              void manufacturerField.onChange(event);
              setValue("model", "");
              setValue("year", undefined as unknown as number);
            },
          }}
        >
          <option value="">Select manufacturer</option>
          {manufacturer && !vehicleCatalog.some((entry) => entry.manufacturer === manufacturer) ? (
            <option value={manufacturer} disabled>{manufacturer}</option>
          ) : null}
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
            value: model,
            disabled: !catalogReady || !manufacturer,
            onChange: (event) => {
              void modelField.onChange(event);
              setValue("year", undefined as unknown as number);
            },
          }}
        >
          <option value="">Select model</option>
          {model && !models.some((entry) => entry.name === model) ? <option value={model} disabled>{model}</option> : null}
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
            value: Number.isFinite(year) ? year : "",
            disabled: !catalogReady || !model,
          }}
        >
          <option value="">Select year</option>
          {Number.isFinite(year) && !years.includes(year) ? <option value={year} disabled>{year}</option> : null}
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </SelectInput>
      </div>
      <StepActions isSaving={isSaving} saveDisabled={!catalogReady} onBack={onBack} />
    </form>
  );
}
