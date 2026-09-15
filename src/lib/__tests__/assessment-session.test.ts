import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNewAssessment, initializeAssessment } from "@/lib/assessment-session";
import type { Assessment } from "@/types/assessment";

const storageKey = "home-charging-assessment:draft";
const token = "a-secure-legacy-resume-token-for-exchange";
const fetchMock = vi.fn<typeof fetch>();
let storedValues: Map<string, string>;
let location: { search: string };
let localStorage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
let replaceState: ReturnType<typeof vi.fn>;

const draft: Assessment = {
  id: "507f1f77bcf86cd799439011",
  status: "draft",
  currentStep: 4,
  lastCompletedStep: 3,
  sections: { electricalPanel: { panelLocation: "Garage", mainBreakerCapacity: 200, availableSlots: 2 } },
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-02T12:00:00.000Z",
  lastActivityAt: "2026-09-02T12:00:00.000Z",
};

function assessmentResponse(assessment = draft) {
  return Response.json({ assessment });
}

describe("assessment session initialization", () => {
  beforeEach(() => {
    storedValues = new Map();
    location = { search: "" };
    localStorage = {
      getItem: vi.fn((key: string) => storedValues.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { storedValues.set(key, value); }),
      removeItem: vi.fn((key: string) => { storedValues.delete(key); }),
    };
    replaceState = vi.fn((_data: unknown, _unused: string, url: string) => {
      location.search = new URL(url, "http://localhost").search;
    });
    vi.stubGlobal("window", { location, localStorage, history: { replaceState } });
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(assessmentResponse());
  });

  afterEach(() => vi.unstubAllGlobals());

  it("prioritizes URL resume and removes the token before the exchange starts", async () => {
    storedValues.set(storageKey, JSON.stringify({ assessmentId: "another-draft" }));
    location.search = `?assessmentId=${draft.id}&resumeToken=${token}`;
    let resolveResponse: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => {
      expect(location.search).toBe(`?assessmentId=${draft.id}`);
      return new Promise<Response>((resolve) => { resolveResponse = resolve; });
    });

    const restoration = initializeAssessment();
    expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, "", `/assessment?assessmentId=${draft.id}`);
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/api/assessments/${draft.id}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeToken: token }),
    });

    resolveResponse(assessmentResponse());
    expect(await restoration).toEqual({ assessment: draft, credentials: { assessmentId: draft.id } });
    expect(storedValues.get(storageKey)).toBe(JSON.stringify({ assessmentId: draft.id }));
    expect(localStorage.setItem).toHaveBeenCalledExactlyOnceWith(storageKey, JSON.stringify({ assessmentId: draft.id }));
  });

  it("restores the stored assessment with the cookie session and preserves its current step", async () => {
    storedValues.set(storageKey, JSON.stringify({ assessmentId: draft.id }));
    const session = await initializeAssessment();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/api/assessments/${draft.id}`);
    expect(session.assessment).toEqual(draft);
    expect(session.assessment.currentStep).toBe(4);
    expect(location.search).toBe(`?assessmentId=${draft.id}`);
  });

  it("exchanges a legacy localStorage token and rewrites storage with only the ID", async () => {
    storedValues.set(storageKey, JSON.stringify({ assessmentId: draft.id, resumeToken: token }));
    await initializeAssessment();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/api/assessments/${draft.id}/resume`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeToken: token }),
    });
    expect(storedValues.get(storageKey)).toBe(JSON.stringify({ assessmentId: draft.id }));
  });

  it.each(["", "?assessmentId=unaccompanied-id", `?resumeToken=${token}`])(
    "creates a new assessment when no complete resume credentials exist: %s",
    async (search) => {
      location.search = search;
      const newDraft = { ...draft, currentStep: 1 as const, lastCompletedStep: 0, sections: {} };
      fetchMock.mockResolvedValueOnce(assessmentResponse(newDraft));
      expect(await initializeAssessment()).toEqual({ assessment: newDraft, credentials: { assessmentId: draft.id } });
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/assessments", { method: "POST" });
      expect(storedValues.get(storageKey)).toBe(JSON.stringify({ assessmentId: draft.id }));
    },
  );

  it.each(["{broken json", "null", "{}"])("recovers from invalid stored credentials: %s", async (stored) => {
    storedValues.set(storageKey, stored);
    await initializeAssessment();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/assessments", { method: "POST" });
    expect(localStorage.removeItem).toHaveBeenCalledWith(storageKey);
  });

  it.each(["url", "stored"])("restores a completed assessment from %s and clears the stored draft", async (source) => {
    storedValues.set(storageKey, JSON.stringify({ assessmentId: draft.id }));
    if (source === "url") location.search = `?assessmentId=${draft.id}&resumeToken=${token}`;
    const completed: Assessment = {
      ...draft, status: "completed", currentStep: 7, lastCompletedStep: 7, completedAt: draft.updatedAt,
    };
    fetchMock.mockResolvedValueOnce(assessmentResponse(completed));

    expect(await initializeAssessment()).toEqual({ assessment: completed, credentials: { assessmentId: draft.id } });
    expect(storedValues.has(storageKey)).toBe(false);
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(location.search).not.toContain(token);
  });

  it("keeps the URL token removed after a failed exchange without creating a replacement draft", async () => {
    storedValues.set(storageKey, JSON.stringify({ assessmentId: "old-draft" }));
    location.search = `?assessmentId=${draft.id}&resumeToken=${token}`;
    fetchMock.mockResolvedValueOnce(Response.json({ error: { message: "Resume token is invalid." } }, { status: 401 }));

    await expect(initializeAssessment()).rejects.toThrow("Resume token is invalid.");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(location.search).toBe(`?assessmentId=${draft.id}`);
    expect(storedValues.has(storageKey)).toBe(false);
  });

  it("clears failed stored sessions and preserves network errors", async () => {
    storedValues.set(storageKey, JSON.stringify({ assessmentId: draft.id }));
    fetchMock.mockRejectedValueOnce(new Error("Failed to fetch"));
    await expect(initializeAssessment()).rejects.toThrow("Failed to fetch");
    expect(storedValues.has(storageKey)).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("supports explicitly starting over without exposing credentials or retaining the old draft", async () => {
    storedValues.set(storageKey, JSON.stringify({ assessmentId: "old-draft" }));
    fetchMock.mockRejectedValueOnce(new Error("Server unavailable"));
    await expect(createNewAssessment()).rejects.toThrow("Server unavailable");
    expect(storedValues.has(storageKey)).toBe(false);

    await createNewAssessment();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/assessments", { method: "POST" });
    expect(storedValues.get(storageKey)).toBe(JSON.stringify({ assessmentId: draft.id }));
  });
});
