"use client";

import { useForm } from "react-hook-form";
import type { ElectricalPanel } from "@/types/assessment";
import { electricalPanelSchema } from "@/validation/assessment";
import { formResolver } from "@/lib/form-resolver";
import { TextInput } from "@/components/ui/TextInput";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import type { NavigableStepProps } from "./types";

export function ElectricalPanelStep({
  defaultValues,
  isSaving,
  onBack,
  onSave,
}: NavigableStepProps<ElectricalPanel>) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ElectricalPanel>({
    resolver: formResolver<ElectricalPanel>(electricalPanelSchema),
    defaultValues: defaultValues ?? {
      panelLocation: "",
      mainBreakerCapacity: undefined as unknown as number,
      availableSlots: undefined as unknown as number,
    },
    mode: "onBlur",
  });

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <StepHeader
        title="Electrical panel"
        description="Provide the basic panel information available to you."
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <TextInput
          label="Panel location"
          error={errors.panelLocation?.message}
          inputProps={register("panelLocation")}
        />
        <TextInput
          label="Main breaker capacity"
          type="number"
          min="0"
          step="1"
          error={errors.mainBreakerCapacity?.message}
          inputProps={register("mainBreakerCapacity", { valueAsNumber: true })}
        />
        <TextInput
          label="Number of available slots"
          type="number"
          min="0"
          step="1"
          error={errors.availableSlots?.message}
          inputProps={register("availableSlots", { valueAsNumber: true })}
        />
      </div>
      <StepActions isSaving={isSaving} onBack={onBack} />
    </form>
  );
}
