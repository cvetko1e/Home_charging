"use client";

import { useForm } from "react-hook-form";
import type { PersonalDetails } from "@/types/assessment";
import { personalDetailsSchema } from "@/validation/assessment";
import { formResolver } from "@/lib/form-resolver";
import { TextInput } from "@/components/ui/TextInput";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import type { StepProps } from "./types";

export function PersonalDetailsStep({
  defaultValues,
  isSaving,
  onSave,
}: StepProps<PersonalDetails>) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalDetails>({
    resolver: formResolver<PersonalDetails>(personalDetailsSchema),
    defaultValues: defaultValues ?? {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
    },
    mode: "onBlur",
  });

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <StepHeader
        title="Personal details"
        description="Tell us who the installation request is for."
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <TextInput
          label="First name"
          error={errors.firstName?.message}
          inputProps={register("firstName")}
        />
        <TextInput
          label="Last name"
          error={errors.lastName?.message}
          inputProps={register("lastName")}
        />
        <TextInput
          label="Email"
          type="email"
          error={errors.email?.message}
          inputProps={register("email")}
        />
        <TextInput
          label="Phone number"
          type="tel"
          error={errors.phoneNumber?.message}
          inputProps={register("phoneNumber")}
        />
      </div>
      <StepActions isSaving={isSaving} />
    </form>
  );
}
