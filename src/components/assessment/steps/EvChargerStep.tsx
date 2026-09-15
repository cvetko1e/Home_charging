"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { EvCharger } from "@/types/assessment";
import { createChargerSelectionSchema } from "@/validation/catalogs";
import { formResolver } from "@/lib/form-resolver";
import { getChargerModels } from "@/lib/catalogs";
import { useChargerCatalog } from "@/hooks/use-catalogs";
import { CatalogStatus } from "../CatalogStatus";
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
  const { state: catalog, retry } = useChargerCatalog();
  const chargerCatalog = catalog.status === "ready" ? catalog.data.chargers : [];
  const catalogReady = catalog.status === "ready";
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<EvCharger>({
    resolver: formResolver<EvCharger>(createChargerSelectionSchema(chargerCatalog)),
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
  const chargerModel = useWatch({ control, name: "chargerModel" }) ?? "";
  const chargerModels = getChargerModels(chargerCatalog, chargerBrand);
  const chargerBrandField = register("chargerBrand");

  useEffect(() => {
    if (!wantsToPurchaseCharger) {
      setValue("chargerBrand", "");
      setValue("chargerModel", "");
    }
  }, [setValue, wantsToPurchaseCharger]);

  return (
    <form onSubmit={handleSubmit((data) => {
      if (!data.wantsToPurchaseCharger || catalogReady) return onSave(data);
    })} noValidate aria-busy={wantsToPurchaseCharger && catalog.status === "loading"}>
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
          <>
            <CatalogStatus state={catalog} label="chargers" onRetry={retry} />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectInput
                label="Charger brand"
                error={errors.chargerBrand?.message}
                inputProps={{
                  ...chargerBrandField,
                  value: chargerBrand,
                  disabled: !catalogReady,
                  onChange: (event) => {
                    void chargerBrandField.onChange(event);
                    setValue("chargerModel", "");
                  },
                }}
              >
                <option value="">Select charger brand</option>
                {chargerBrand && !chargerCatalog.some((entry) => entry.brand === chargerBrand) ? (
                  <option value={chargerBrand} disabled>{chargerBrand}</option>
                ) : null}
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
                  value: chargerModel,
                  disabled: !catalogReady || !chargerBrand,
                }}
              >
                <option value="">Select charger model</option>
                {chargerModel && !chargerModels.includes(chargerModel) ? <option value={chargerModel} disabled>{chargerModel}</option> : null}
                {chargerModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </SelectInput>
            </div>
          </>
        ) : null}
      </div>
      <StepActions isSaving={isSaving} saveDisabled={wantsToPurchaseCharger && !catalogReady} onBack={onBack} />
    </form>
  );
}
