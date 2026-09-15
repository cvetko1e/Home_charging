"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { EvCharger } from "@/types/assessment";
import { evChargerSchema } from "@/validation/assessment";
import { formResolver } from "@/lib/form-resolver";
import { chargerCatalog, getChargerModels } from "@/lib/catalogs";
import { SelectInput } from "@/components/ui/SelectInput";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import type { NavigableStepProps } from "./types";

export function EvChargerStep({
  defaultValues,
  isSaving,
  onBack,
  onSave,
}: NavigableStepProps<EvCharger>) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<EvCharger>({
    resolver: formResolver<EvCharger>(evChargerSchema),
    defaultValues: defaultValues ?? {
      wantsToPurchaseCharger: false,
      chargerBrand: "",
      chargerModel: "",
    },
    mode: "onBlur",
  });
  const wantsToPurchaseCharger =
    useWatch({ control, name: "wantsToPurchaseCharger" }) ?? false;
  const chargerBrand = useWatch({ control, name: "chargerBrand" }) ?? "";
  const chargerModels = getChargerModels(chargerBrand);
  const chargerBrandField = register("chargerBrand");

  useEffect(() => {
    if (!wantsToPurchaseCharger) {
      setValue("chargerBrand", "");
      setValue("chargerModel", "");
    }
  }, [setValue, wantsToPurchaseCharger]);

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <StepHeader
        title="EV charger"
        description="Purchasing a charger is optional. Completing the assessment submits the installation request."
      />
      <div className="mt-6 grid gap-5">
        <label className="flex items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-800">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
            {...register("wantsToPurchaseCharger")}
          />
          <span>I want to purchase an EV charger with this installation.</span>
        </label>

        {wantsToPurchaseCharger ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectInput
              label="Charger brand"
              error={errors.chargerBrand?.message}
              inputProps={{
                ...chargerBrandField,
                onChange: (event) => {
                  void chargerBrandField.onChange(event);
                  setValue("chargerModel", "");
                },
              }}
            >
              <option value="">Select charger brand</option>
              {chargerCatalog.map((entry) => (
                <option key={entry.brand} value={entry.brand}>
                  {entry.brand}
                </option>
              ))}
            </SelectInput>
            <SelectInput
              label="Charger model"
              error={errors.chargerModel?.message}
              inputProps={{
                ...register("chargerModel"),
                disabled: !chargerBrand,
              }}
            >
              <option value="">Select charger model</option>
              {chargerModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </SelectInput>
          </div>
        ) : null}
      </div>
      <StepActions isSaving={isSaving} onBack={onBack} />
    </form>
  );
}
