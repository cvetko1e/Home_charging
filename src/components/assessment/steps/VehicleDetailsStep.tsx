"use client";

import { useForm, useWatch } from "react-hook-form";
import type { VehicleDetails } from "@/types/assessment";
import { vehicleDetailsSchema } from "@/validation/assessment";
import { formResolver } from "@/lib/form-resolver";
import { getVehicleModels, getVehicleYears, vehicleCatalog } from "@/lib/catalogs";
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
