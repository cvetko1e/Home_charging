"use client";

import { useForm } from "react-hook-form";
import type { HomeInformation } from "@/types/assessment";
import { homeInformationSchema } from "@/validation/assessment";
import { formResolver } from "@/lib/form-resolver";
import { majorApplianceOptions } from "@/lib/catalogs";
import { TextAreaInput } from "@/components/ui/TextAreaInput";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import type { NavigableStepProps } from "./types";

export function HomeInformationStep({
  defaultValues,
  isSaving,
  onBack,
  onSave,
}: NavigableStepProps<HomeInformation>) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HomeInformation>({
    resolver: formResolver<HomeInformation>(homeInformationSchema),
    defaultValues: defaultValues ?? {
      address: "",
      majorAppliances: [],
    },
    mode: "onBlur",
  });

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <StepHeader
        title="Home information"
        description="Share the installation address and major energy-consuming appliances."
      />
      <div className="mt-6 grid gap-6">
        <TextAreaInput
          label="Address"
          error={errors.address?.message}
          inputProps={register("address")}
        />
        <fieldset>
          <legend className="text-sm font-semibold text-neutral-900">
            Major energy-consuming appliances
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {majorApplianceOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-800"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
                  {...register("majorAppliances")}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {errors.majorAppliances?.message ? (
            <p className="mt-2 text-sm font-medium text-red-700">
              {errors.majorAppliances.message}
            </p>
          ) : null}
        </fieldset>
      </div>
      <StepActions isSaving={isSaving} onBack={onBack} />
    </form>
  );
}
