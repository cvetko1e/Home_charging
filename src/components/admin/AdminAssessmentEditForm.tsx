"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import {
  adminAssessmentUpdateSchema,
  type AdminAssessmentUpdateInput,
} from "@/validation/admin";

type AdminAssessmentEditFormProps = {
  assessmentId: string;
  canEditContactFields: boolean;
  defaultValues: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    adminNotes: string;
  };
};

async function readUpdateError(response: Response) {
  const payload = await response.json().catch(() => null);

  return payload?.error?.message ?? "Assessment could not be updated.";
}

export function AdminAssessmentEditForm({
  assessmentId,
  canEditContactFields,
  defaultValues,
}: AdminAssessmentEditFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const submissionPending = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isSaving },
  } = useForm<AdminAssessmentUpdateInput>({
    resolver: zodResolver(adminAssessmentUpdateSchema),
    defaultValues: canEditContactFields
      ? defaultValues
      : { adminNotes: defaultValues.adminNotes },
  });

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionPending.current) {
      return;
    }

    submissionPending.current = true;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await handleSubmit(saveAssessment)(event);
    } finally {
      submissionPending.current = false;
    }
  }

  async function saveAssessment(data: AdminAssessmentUpdateInput) {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          canEditContactFields ? data : { adminNotes: data.adminNotes },
        ),
      });

      if (!response.ok) {
        setErrorMessage(await readUpdateError(response));
        return;
      }

      setSuccessMessage("Assessment updated.");
      router.refresh();
    } catch {
      setErrorMessage(
        "Assessment could not be updated. Check your connection and try again.",
      );
    }
  }

  return (
    <form
      onSubmit={submitForm}
      noValidate
      aria-busy={isSaving}
      className="grid gap-4 rounded-md border border-white/10 bg-white p-5 text-neutral-950"
    >
      <div>
        <h3 className="text-lg font-semibold">Editable customer fields</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Only approved customer contact fields and internal notes can be saved.
        </p>
      </div>
      {!canEditContactFields ? (
        <p className="text-sm text-neutral-600">
          Contact fields cannot be updated because the personal details section
          is missing or incomplete. Internal admin notes can still be saved.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <EditInput
          label="First name"
          inputProps={register("firstName", { disabled: !canEditContactFields })}
          error={errors.firstName?.message}
        />
        <EditInput
          label="Last name"
          inputProps={register("lastName", { disabled: !canEditContactFields })}
          error={errors.lastName?.message}
        />
        <EditInput
          label="Email"
          type="email"
          inputProps={register("email", { disabled: !canEditContactFields })}
          error={errors.email?.message}
        />
        <EditInput
          label="Phone number"
          type="tel"
          inputProps={register("phoneNumber", { disabled: !canEditContactFields })}
          error={errors.phoneNumber?.message}
        />
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-900">
          Internal admin notes
        </span>
        <textarea
          {...register("adminNotes")}
          rows={5}
          aria-invalid={Boolean(errors.adminNotes)}
          aria-describedby={errors.adminNotes ? "adminNotes-error" : undefined}
          className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        />
        {errors.adminNotes?.message ? (
          <FieldError name="adminNotes" message={errors.adminNotes.message} />
        ) : null}
      </label>
      {errorMessage ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
          aria-live="polite"
        >
          {successMessage}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function EditInput({
  error,
  inputProps,
  label,
  type = "text",
}: {
  error?: string;
  inputProps: UseFormRegisterReturn;
  label: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <input
        {...inputProps}
        type={type}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputProps.name}-error` : undefined}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
      />
      {error ? <FieldError name={inputProps.name} message={error} /> : null}
    </label>
  );
}

function FieldError({ name, message }: { name: string; message: string }) {
  return (
    <p
      id={`${name}-error`}
      role="alert"
      className="mt-2 text-sm font-medium text-red-700"
    >
      {message}
    </p>
  );
}
