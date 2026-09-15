import type { FormEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { UseFormProps } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAssessmentEditForm } from "@/components/admin/AdminAssessmentEditForm";
import type { AdminAssessmentUpdateInput } from "@/validation/admin";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  setMessage: vi.fn(),
  isSaving: false,
  errors: {} as Record<string, { type: string; message: string }>,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState: (initial: string | null) => {
      const [state, setState] = react.useState(initial);
      return [state, (value: string | null) => {
        mocks.setMessage(value);
        setState(value);
      }];
    },
  };
});
vi.mock("react-hook-form", async (importOriginal) => {
  const rhf = await importOriginal<typeof import("react-hook-form")>();
  return {
    ...rhf,
    useForm: (options: UseFormProps<AdminAssessmentUpdateInput>) => {
      const form = rhf.useForm(options);
      return {
        ...form,
        formState: { ...form.formState, errors: mocks.errors, isSubmitting: mocks.isSaving },
      };
    },
  };
});

const defaultValues = {
  firstName: "Avery",
  lastName: "Stone",
  email: "AVERY@example.com",
  phoneNumber: "+1 555 123 4567",
  adminNotes: " Call customer. ",
};
const fetchMock = vi.fn<typeof fetch>();

function renderForm(overrides: Partial<Parameters<typeof AdminAssessmentEditForm>[0]> = {}) {
  let form: ReturnType<typeof AdminAssessmentEditForm> | undefined;

  // Render with React's real hook dispatcher and retain the submission handler.
  function CaptureForm() {
    form = AdminAssessmentEditForm({
      assessmentId: "507f1f77bcf86cd799439011",
      canEditContactFields: true,
      defaultValues,
      ...overrides,
    });
    return form;
  }

  const html = renderToStaticMarkup(<CaptureForm />);
  const submit = () => form?.props.onSubmit({
    preventDefault: vi.fn(),
    persist: vi.fn(),
  } as unknown as FormEvent<HTMLFormElement>);

  return { html, submit };
}

describe("admin assessment edit form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    mocks.errors = {};
    mocks.isSaving = false;
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    { email: "not-an-email" },
    { phoneNumber: "invalid" },
    { firstName: "a".repeat(101) },
    { adminNotes: "a".repeat(5001) },
  ])("validates with the real resolver before requesting an update: %j", async (invalid) => {
    const form = renderForm({ defaultValues: { ...defaultValues, ...invalid } });
    await form.submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("sends validated, normalized fields and refreshes after success", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await renderForm().submit();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "/api/admin/assessments/507f1f77bcf86cd799439011",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...defaultValues, email: "avery@example.com", adminNotes: "Call customer." }),
      },
    );
    expect(mocks.setMessage).toHaveBeenCalledWith("Assessment updated.");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("disables contact inputs and sends only notes when personal details cannot be edited", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    const form = renderForm({ canEditContactFields: false });
    await form.submit();

    expect(form.html.match(/<input[^>]*disabled=""/g)).toHaveLength(4);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ adminNotes: "Call customer." });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("prevents duplicate requests while saving", async () => {
    let finishRequest: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => { finishRequest = resolve; }));
    const form = renderForm();
    const firstSubmission = form.submit();
    await form.submit();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    finishRequest(new Response("{}", { status: 200 }));
    await firstSubmission;
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("shows network errors and allows a retry", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const form = renderForm();
    await form.submit();
    expect(mocks.setMessage).toHaveBeenCalledWith(
      "Assessment could not be updated. Check your connection and try again.",
    );
    expect(mocks.refresh).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    await form.submit();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("preserves controlled API error messages", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { message: "Assessment was not found." } }), { status: 404 }));
    await renderForm().submit();
    expect(mocks.setMessage).toHaveBeenCalledWith("Assessment was not found.");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("links inline validation errors to every editable field", () => {
    for (const name of Object.keys(defaultValues)) {
      mocks.errors[name] = { type: "too_big", message: `${name} is too long.` };
    }
    const { html } = renderForm();

    for (const name of Object.keys(defaultValues)) {
      expect(html).toContain(`aria-describedby="${name}-error"`);
      expect(html).toContain(`id="${name}-error" role="alert"`);
      expect(html).toContain(`${name} is too long.`);
    }
    expect(html.match(/aria-invalid="true"/g)).toHaveLength(5);
  });

  it("keeps the saving state accessible and disables submission", () => {
    mocks.isSaving = true;
    const { html } = renderForm();
    expect(html).toContain('aria-busy="true"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Saving\.\.\./);
  });
});
