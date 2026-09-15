"use client";

import { useForm } from "react-hook-form";
import type { ChargerInstallation } from "@/types/assessment";
import { chargerInstallationSchema } from "@/validation/assessment";
import { formResolver } from "@/lib/form-resolver";
import { TextInput } from "@/components/ui/TextInput";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import type { NavigableStepProps } from "./types";

export function ChargerInstallationStep({
  defaultValues,
  isSaving,
  onBack,
  onSave,
}: NavigableStepProps<ChargerInstallation>) {
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
