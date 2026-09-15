import bcrypt from "bcryptjs";
import { MongoNetworkError, MongoNotConnectedError, MongoServerSelectionError, ObjectId } from "mongodb";
import { notFound, redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createDraft } from "@/app/api/assessments/route";
import { GET as getAssessment } from "@/app/api/assessments/[assessmentId]/route";
import { PATCH as saveStep } from "@/app/api/assessments/[assessmentId]/steps/[step]/route";
import { POST as resumeAssessment } from "@/app/api/assessments/[assessmentId]/resume/route";
import { POST as submitAssessment } from "@/app/api/assessments/[assessmentId]/complete/route";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { GET as listAssessments } from "@/app/api/admin/assessments/route";
import { GET as adminDetail, PATCH as adminUpdate } from "@/app/api/admin/assessments/[assessmentId]/route";
import { jsonFromError, readJsonBody } from "@/app/api/_utils";
import { DatabaseConfigurationError } from "@/lib/database-errors";
import { createAssessmentResumeCookieValue, getAssessmentResumeCookieName, readAssessmentResumeToken } from "@/lib/assessmentResumeCookie";
import { hashSecret } from "@/lib/security";
import * as assessments from "@/repositories/assessments";
import * as admins from "@/repositories/admins";
import type { AssessmentDocument } from "@/repositories/assessments";
import type { AdminDocument, AdminSessionDocument } from "@/types/admin";

vi.mock("@/repositories/assessments", () => ({
  insertAssessmentDraft: vi.fn(), findAssessmentById: vi.fn(),
  updateAssessmentDraftStep: vi.fn(), completeAssessmentDraft: vi.fn(),
  findAssessmentForAdmin: vi.fn(), updateAssessmentByAdmin: vi.fn(),
  listAssessmentsForAdmin: vi.fn(), getAssessmentRepositoryStats: vi.fn(),
}));
vi.mock("@/repositories/admins", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/repositories/admins")>(),
  findAdminByEmail: vi.fn(), insertAdminSession: vi.fn(),
  findActiveAdminSessionByTokenHash: vi.fn(), invalidateAdminSession: vi.fn(),
}));

const assessmentId = "507f1f77bcf86cd799439011";
const resumeToken = "a".repeat(43);
const adminToken = "b".repeat(43);
const now = new Date("2026-09-15T12:00:00.000Z");
const expiresAt = new Date("2026-09-16T12:00:00.000Z");
const personalDetails = {
  firstName: "Morgan", lastName: "Lee", email: "morgan@example.com", phoneNumber: "+1 555 123 4567",
};
const sections = {
  personalDetails,
  vehicleDetails: { manufacturer: "Tesla", model: "Model 3", year: 2024 },
  electricalPanel: { panelLocation: "Garage", mainBreakerCapacity: 200, availableSlots: 4 },
  chargerInstallation: { proposedChargerLocation: "Garage", distanceFromPanel: 22 },
  homeInformation: { address: "100 Main Street", majorAppliances: ["water_heater" as const] },
  evCharger: { wantsToPurchaseCharger: false },
};
const document: AssessmentDocument = {
  _id: new ObjectId(assessmentId), status: "draft", currentStep: 7, lastCompletedStep: 6,
  sections, resumeTokenHash: hashSecret(resumeToken), createdAt: now, updatedAt: now, lastActivityAt: now,
};
const publicAssessment = {
  id: assessmentId, status: "draft", currentStep: 7, lastCompletedStep: 6, sections,
  createdAt: now.toISOString(), updatedAt: now.toISOString(), lastActivityAt: now.toISOString(),
};
const publicAdminDetail = { ...publicAssessment, adminNotes: "", missingSections: [] };
const admin: AdminDocument = {
  _id: new ObjectId("507f1f77bcf86cd799439012"), email: "admin@example.com", passwordHash: "stored-password-hash",
  role: "admin", active: true, createdAt: now, updatedAt: now,
};
const adminSession: AdminSessionDocument = {
  _id: new ObjectId(), adminId: admin._id, sessionTokenHash: hashSecret(adminToken), createdAt: now, expiresAt,
};

function params() {
  return { params: Promise.resolve({ assessmentId }) };
}

function request(method = "GET", body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/test", {
    method, headers: { "Content-Type": "application/json", ...headers },
    ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  });
}

function adminRequest(method = "GET", body?: unknown) {
  return request(method, body, { cookie: `test_admin_session=${adminToken}` });
}

function stepRequest(body: unknown) {
  return saveStep(request("PATCH", body), { params: Promise.resolve({ assessmentId, step: "1" }) });
}

async function expectError(response: Response, status: number, message: string, details?: unknown) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error: { message, ...(details === undefined ? {} : { details }) } });
  expect(response.headers.get("set-cookie")).toBeNull();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  vi.stubEnv("ADMIN_SESSION_COOKIE_NAME", "test_admin_session");
  vi.stubEnv("ADMIN_SESSION_DAYS", "1");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(bcrypt, "compare").mockImplementation(async () => true);
  vi.mocked(assessments.findAssessmentById).mockResolvedValue(document);
  vi.mocked(assessments.findAssessmentForAdmin).mockResolvedValue(document);
  vi.mocked(assessments.updateAssessmentByAdmin).mockResolvedValue(document);
  vi.mocked(admins.findAdminByEmail).mockResolvedValue(admin);
  vi.mocked(admins.findActiveAdminSessionByTokenHash).mockResolvedValue({ session: adminSession, admin });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("API error contracts through real services", () => {
  it.each([
    ["login", () => login(request("POST", "{"))],
    ["resume", () => resumeAssessment(request("POST", "{"), params())],
    ["save step", () => stepRequest("{")],
    ["completion", () => submitAssessment(request("POST", "{"), params())],
    ["admin update", () => adminUpdate(adminRequest("PATCH", "{"), params())],
  ] as const)("preserves invalid JSON responses for %s", async (_name, call) => {
    await expectError(await call(), 400, "Request body must be valid JSON.");
    expect(console.error).not.toHaveBeenCalled();
    expect(assessments.updateAssessmentByAdmin).not.toHaveBeenCalled();
    expect(admins.findAdminByEmail).not.toHaveBeenCalled();
  });

  it("returns invalid JSON as a typed result", async () => {
    await expect(readJsonBody(request("POST", "{"))).resolves.toMatchObject({
      success: false, error: { code: "INVALID_REQUEST", message: "Request body must be valid JSON." },
    });
  });

  it("retains flattened Zod field errors", async () => {
    await expectError(await login(request("POST", { email: "invalid", password: "" })), 400, "Validation failed.", {
      formErrors: [], fieldErrors: { email: ["Enter a valid email address."], password: ["Password is required."] },
    });
    expect(admins.findAdminByEmail).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("retains flattened Zod form errors for invalid business operations", async () => {
    await expectError(await adminUpdate(adminRequest("PATCH", {}), params()), 400, "Validation failed.", {
      formErrors: ["At least one editable field is required."], fieldErrors: {},
    });
    expect(assessments.updateAssessmentByAdmin).not.toHaveBeenCalled();
  });

  it.each(["missing account", "inactive account", "wrong password"])("rejects %s only after bcrypt comparison", async (state) => {
    if (state === "missing account") vi.mocked(admins.findAdminByEmail).mockResolvedValue(null);
    if (state === "inactive account") vi.mocked(admins.findAdminByEmail).mockResolvedValue({ ...admin, active: false });
    if (state === "wrong password") vi.mocked(bcrypt.compare).mockImplementation(async () => false);
    await expectError(await login(request("POST", { email: "ADMIN@example.com", password: "supplied-password" })), 401, "Invalid email or password.");
    expect(admins.findAdminByEmail).toHaveBeenCalledExactlyOnceWith("admin@example.com");
    expect(bcrypt.compare).toHaveBeenCalledExactlyOnceWith("supplied-password", state === "missing account" ? expect.stringMatching(/^\$2b\$12\$/) : admin.passwordHash);
    expect(admins.insertAdminSession).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each(["missing", "invalid token"])("preserves opaque assessment lookup failure: %s", async (state) => {
    if (state === "missing") vi.mocked(assessments.findAssessmentById).mockResolvedValue(null);
    const token = state === "invalid token" ? "z".repeat(43) : resumeToken;
    await expectError(await getAssessment(request("GET", undefined, { "x-resume-token": token }), params()), 404, "Assessment was not found or the resume token is invalid.");
  });

  it("preserves missing admin assessment responses", async () => {
    vi.mocked(assessments.findAssessmentForAdmin).mockResolvedValue(null);
    await expectError(await adminDetail(adminRequest(), params()), 404, "Assessment was not found.");
  });

  it("preserves the missing resume session response", async () => {
    await expectError(await getAssessment(request(), params()), 401, "A resume session or token is required.");
    expect(assessments.findAssessmentById).not.toHaveBeenCalled();
  });

  it("rejects edits and resubmission of completed assessments with existing conflict messages", async () => {
    vi.mocked(assessments.findAssessmentById).mockResolvedValue({ ...document, status: "completed" });
    await expectError(await stepRequest({ resumeToken, data: personalDetails }), 409, "Completed assessments cannot be edited.");
    await expectError(await submitAssessment(request("POST", { resumeToken }), params()), 409, "This assessment has already been submitted.");
    expect(assessments.updateAssessmentDraftStep).not.toHaveBeenCalled();
    expect(assessments.completeAssessmentDraft).not.toHaveBeenCalled();
  });

  it.each([undefined, { firstName: "Morgan" }])("rejects missing/incomplete personal details without writes", async (personal) => {
    vi.mocked(assessments.findAssessmentForAdmin).mockResolvedValue({
      ...document, sections: { personalDetails: personal as AssessmentDocument["sections"]["personalDetails"] },
    });
    await expectError(await adminUpdate(adminRequest("PATCH", { firstName: "Alex" }), params()), 409,
      "Contact fields cannot be updated because the personal details section is missing or incomplete.");
    expect(assessments.updateAssessmentByAdmin).not.toHaveBeenCalled();
  });

  it("keeps completion validation details and message", async () => {
    vi.mocked(assessments.findAssessmentById).mockResolvedValue({ ...document, sections: {} });
    const response = await submitAssessment(request("POST", { resumeToken }), params());
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.message).toBe("Complete every assessment step before submitting.");
    expect(payload.error.details.formErrors).toEqual([]);
    expect(Object.keys(payload.error.details.fieldErrors)).toEqual(Object.keys(sections));
    expect(assessments.completeAssessmentDraft).not.toHaveBeenCalled();
  });

  it.each(["invalid", "expired"])("returns 401 for an %s admin session", async (state) => {
    vi.mocked(admins.findActiveAdminSessionByTokenHash).mockResolvedValue(state === "invalid" ? null : {
      admin, session: { ...adminSession, expiresAt: now },
    });
    await expectError(await adminDetail(adminRequest(), params()), 401, "Administrator authentication is required.");
    expect(assessments.findAssessmentForAdmin).not.toHaveBeenCalled();
  });

  it.each([
    // Topology metadata is irrelevant to classification; use a real driver error.
    new MongoServerSelectionError("mongodb://user:secret@private-host", {} as ConstructorParameters<typeof MongoServerSelectionError>[1]),
  ])("classifies MongoDB availability failures without leaking driver text", async (error) => {
    vi.mocked(assessments.insertAssessmentDraft).mockRejectedValue(error);
    await expectError(await createDraft(), 503, "Database connection failed. Verify that MongoDB is running and MONGODB_URI is correct.");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("API request failed:", error);
  });

  it.each(["MONGODB_URI", "MONGODB_DB_NAME"] as const)("preserves the safe missing %s message and 500 status", async (variable) => {
    vi.mocked(assessments.insertAssessmentDraft).mockRejectedValue(new DatabaseConfigurationError(variable));
    await expectError(await createDraft(), 500, `Missing ${variable} environment variable.`);
  });

  it.each([
    new Error("mongodb://user:secret@private-host password=secret token=private-token"),
    new MongoNetworkError("private-token"),
    new MongoNotConnectedError("private-host"),
    Object.assign(new Error("Missing MONGODB_password=secret"), { name: "MongoServerSelectionError" }),
    { message: "private-token", code: "CONFLICT", status: 409, details: { password: "secret" } },
  ])("logs the original unexpected error while returning only a safe response", async (error) => {
    vi.mocked(assessments.insertAssessmentDraft).mockRejectedValue(error);
    await expectError(await createDraft(), 500, "An unexpected error occurred.");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("API request failed:", error);
    if (error instanceof Error) {
      expect(vi.mocked(console.error).mock.calls[0][1]).toBe(error);
      expect(error.stack).toContain(error.message);
    }
  });

  it("does not misclassify a failed request stream as invalid JSON", async () => {
    const error = new Error("stream failed with private-token");
    const body = request("POST", {});
    vi.spyOn(body, "json").mockRejectedValue(error);
    await expectError(await login(body), 500, "An unexpected error occurred.");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("API request failed:", error);
  });

  it.each([() => redirect("/admin/login"), () => notFound()])("rethrows framework control flow from a route catch", async (controlFlow) => {
    vi.mocked(assessments.insertAssessmentDraft).mockImplementation(controlFlow);
    await expect(createDraft()).rejects.toThrow(/NEXT_(REDIRECT|HTTP_ERROR_FALLBACK)/);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("rethrows redirects wrapped in an error cause", () => {
    let redirectError: unknown;
    try { redirect("/admin/login"); } catch (error) { redirectError = error; }
    expect(() => jsonFromError(new Error("wrapper", { cause: redirectError }))).toThrow("NEXT_REDIRECT");
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("unchanged successful API contracts", () => {
  it("creates a draft with 201 and exposes its resume token only in the cookie", async () => {
    const response = await createDraft();
    const inserted = vi.mocked(assessments.insertAssessmentDraft).mock.calls[0][0];
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ assessment: {
      id: inserted._id.toHexString(), status: "draft", currentStep: 1, lastCompletedStep: 0, sections: {},
      createdAt: now.toISOString(), updatedAt: now.toISOString(), lastActivityAt: now.toISOString(),
    } });
    const cookie = response.cookies.get(getAssessmentResumeCookieName());
    const token = readAssessmentResumeToken(cookie?.value, inserted._id.toHexString());
    expect(hashSecret(token!)).toBe(inserted.resumeTokenHash);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("returns the same assessment for header, cookie and resume-link authorization", async () => {
    const headerResponse = await getAssessment(request("GET", undefined, { "x-resume-token": resumeToken }), params());
    const cookieValue = createAssessmentResumeCookieValue(assessmentId, resumeToken);
    const cookieResponse = await getAssessment(request("GET", undefined, {
      cookie: `${getAssessmentResumeCookieName()}=${cookieValue}`,
    }), params());
    const resumeResponse = await resumeAssessment(request("POST", { resumeToken }), params());
    for (const response of [headerResponse, cookieResponse, resumeResponse]) {
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ assessment: publicAssessment });
    }
    expect(resumeResponse.cookies.get(getAssessmentResumeCookieName())?.value).toBe(cookieValue);
  });

  it("returns the same saved step response", async () => {
    vi.mocked(assessments.updateAssessmentDraftStep).mockResolvedValue({ ...document, currentStep: 2 });
    const response = await stepRequest({ resumeToken, data: personalDetails });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ assessment: { ...publicAssessment, currentStep: 2 } });
  });

  it("returns completion data and expires the resume cookie", async () => {
    vi.mocked(assessments.completeAssessmentDraft).mockResolvedValue({ ...document, status: "completed", lastCompletedStep: 7, completedAt: now });
    const response = await submitAssessment(request("POST", { resumeToken }), params());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ assessment: {
      ...publicAssessment, status: "completed", lastCompletedStep: 7, completedAt: now.toISOString(),
    } });
    expect(response.cookies.get(getAssessmentResumeCookieName())?.value).toBe("");
    expect(response.headers.get("set-cookie")).toContain("01 Jan 1970");
  });

  it("returns the admin identity and sets the session cookie without exposing the token in JSON", async () => {
    const response = await login(request("POST", { email: admin.email, password: "valid-password" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ admin: { id: admin._id.toHexString(), email: admin.email, role: "admin" } });
    const cookie = response.cookies.get("test_admin_session");
    expect(hashSecret(cookie!.value)).toBe(vi.mocked(admins.insertAdminSession).mock.calls[0][0].sessionTokenHash);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });

  it("keeps logout idempotent and clears the cookie", async () => {
    for (const req of [adminRequest("POST"), request("POST")]) {
      const response = await logout(req);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(response.cookies.get("test_admin_session")?.value).toBe("");
    }
    expect(admins.invalidateAdminSession).toHaveBeenCalledExactlyOnceWith(hashSecret(adminToken));
  });

  it("keeps admin detail and update response envelopes", async () => {
    for (const response of [await adminDetail(adminRequest(), params()), await adminUpdate(adminRequest("PATCH", { adminNotes: "" }), params())]) {
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ assessment: publicAdminDetail });
    }
  });

  it("keeps the admin list pagination envelope", async () => {
    vi.mocked(assessments.listAssessmentsForAdmin).mockResolvedValue({ documents: [document], total: 1 });
    const response = await listAssessments(adminRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      assessments: [{
        id: assessmentId, status: "draft", lastCompletedStep: 6, customerName: "Morgan Lee", customerEmail: personalDetails.email,
        vehicle: "2024 Tesla Model 3", vehicleManufacturer: "Tesla", vehicleModel: "Model 3",
        createdAt: now.toISOString(), updatedAt: now.toISOString(), lastActivityAt: now.toISOString(),
      }], page: 1, pageSize: 10, total: 1, totalPages: 1,
    });
  });
});
