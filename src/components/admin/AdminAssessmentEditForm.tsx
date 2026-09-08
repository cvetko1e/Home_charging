"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminAssessmentEditFormProps = {
  assessmentId: string;
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
  defaultValues,
}: AdminAssessmentEditFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          email: formData.get("email"),
          phoneNumber: formData.get("phoneNumber"),
          adminNotes: formData.get("adminNotes"),
        }),
      });

      if (!response.ok) {
        setErrorMessage(await readUpdateError(response));
        return;
      }

      setSuccessMessage("Assessment updated.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="grid gap-4 rounded-md border border-white/10 bg-white p-5 text-neutral-950"
    >
      <div>
        <h3 className="text-lg font-semibold">Editable customer fields</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Only approved customer contact fields and internal notes can be saved.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <EditInput
          label="First name"
          name="firstName"
          defaultValue={defaultValues.firstName}
        />
        <EditInput
          label="Last name"
          name="lastName"
          defaultValue={defaultValues.lastName}
        />
        <EditInput
          label="Email"
          name="email"
          type="email"
          defaultValue={defaultValues.email}
        />
        <EditInput
          label="Phone number"
          name="phoneNumber"
          type="tel"
          defaultValue={defaultValues.phoneNumber}
        />
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-900">
          Internal admin notes
        </span>
        <textarea
          name="adminNotes"
          rows={5}
          defaultValue={defaultValues.adminNotes}
          className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        />
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
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <input
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}
