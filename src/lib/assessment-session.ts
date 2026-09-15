import type { Assessment, AssessmentResponse } from "@/types/assessment";

type DraftCredentials = {
  assessmentId: string;
  resumeToken?: string;
};

type UrlDraftCredentials = DraftCredentials & { resumeToken: string };

export type AssessmentSession = {
  assessment: Assessment;
  credentials: { assessmentId: string };
};

const storageKey = "home-charging-assessment:draft";

export async function readApiResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } } | null)?.error?.message ??
      "The request could not be completed.";
    throw new Error(message);
  }

  return payload as T;
}

function readStoredDraft(): DraftCredentials | null {
  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as DraftCredentials;

    if (parsed.assessmentId) {
      return {
        assessmentId: parsed.assessmentId,
        resumeToken:
          typeof parsed.resumeToken === "string"
            ? parsed.resumeToken
            : undefined,
      };
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }

  return null;
}

function persistDraft(credentials: DraftCredentials) {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({ assessmentId: credentials.assessmentId }),
  );
  replaceDraftUrl(credentials.assessmentId);
}

function replaceDraftUrl(assessmentId: string) {
  window.history.replaceState(
    null,
    "",
    `/assessment?assessmentId=${assessmentId}`,
  );
}

export function removeStoredDraft() {
  window.localStorage.removeItem(storageKey);
}

function readDraftFromUrl(): UrlDraftCredentials | null {
  const params = new URLSearchParams(window.location.search);
  const assessmentId = params.get("assessmentId");
  const resumeToken = params.get("resumeToken");

  if (!assessmentId || !resumeToken) {
    return null;
  }

  return { assessmentId, resumeToken };
}

// Scenario selection stays separate from networking and session side effects.
export function initializeAssessment(): Promise<AssessmentSession> {
  const urlDraft = readDraftFromUrl();
  if (urlDraft) return resumeAssessmentFromUrl(urlDraft);

  const storedDraft = readStoredDraft();
  if (storedDraft) return resumeStoredAssessment(storedDraft);

  return createNewAssessment();
}

export function resumeAssessmentFromUrl(credentials: UrlDraftCredentials) {
  // Remove the secret before starting the exchange, including on failed requests.
  replaceDraftUrl(credentials.assessmentId);
  return restoreAssessment(credentials);
}

export function resumeStoredAssessment(credentials: DraftCredentials) {
  // Older localStorage entries may still require the token-to-cookie exchange.
  return restoreAssessment(credentials);
}

async function restoreAssessment(
  credentials: DraftCredentials,
): Promise<AssessmentSession> {
  try {
    const response = credentials.resumeToken
      ? await fetch(`/api/assessments/${credentials.assessmentId}/resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeToken: credentials.resumeToken }),
        })
      : await fetch(`/api/assessments/${credentials.assessmentId}`);
    const payload = await readApiResponse<AssessmentResponse>(response);
    const nextCredentials = { assessmentId: credentials.assessmentId };

    if (payload.assessment.status === "completed") {
      removeStoredDraft();
    } else {
      persistDraft(nextCredentials);
    }

    return { assessment: payload.assessment, credentials: nextCredentials };
  } catch (error) {
    removeStoredDraft();
    throw new Error(
      error instanceof Error
        ? error.message
        : "The saved assessment could not be restored.",
    );
  }
}

export async function createNewAssessment(): Promise<AssessmentSession> {
  removeStoredDraft();

  try {
    const response = await fetch("/api/assessments", { method: "POST" });
    const payload = await readApiResponse<AssessmentResponse>(response);
    const credentials = { assessmentId: payload.assessment.id };
    persistDraft(credentials);

    return { assessment: payload.assessment, credentials };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "The assessment could not be started.",
    );
  }
}
