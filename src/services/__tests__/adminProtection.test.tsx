import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedAdminLayout from "@/app/admin/(protected)/layout";
import AdminLoginPage from "@/app/admin/login/page";
import type { ReactElement } from "react";
import { GET as listAssessments } from "@/app/api/admin/assessments/route";
import { GET as getAssessment, PATCH as updateAssessment } from "@/app/api/admin/assessments/[assessmentId]/route";
import { hashSecret } from "@/lib/security";
import type { AdminDocument, AdminSessionDocument } from "@/types/admin";

const mocks = vi.hoisted(() => ({
  cookieValue: undefined as string | undefined,
  readCookie: vi.fn(),
  findSession: vi.fn(),
  findAdmin: vi.fn(),
  list: vi.fn(),
  detail: vi.fn(),
  update: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.readCookie }),
}));
vi.mock("next/navigation", async (importOriginal) => {
  const original = await importOriginal<typeof import("next/navigation")>();
  return { ...original, redirect: vi.fn(original.redirect) };
});
vi.mock("@/components/admin/LogoutButton", () => ({ LogoutButton: () => null }));
vi.mock("@/lib/mongodb", () => ({
  getMongoDb: async () => ({
    collection: (name: string) => {
      if (name === "admin_sessions") return { findOne: mocks.findSession };
      if (name === "admins") return { findOne: mocks.findAdmin };
      throw new Error(`Unexpected database collection: ${name}`);
    },
  }),
}));
vi.mock("@/services/adminAssessments", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/adminAssessments")>(),
  getAdminAssessmentList: mocks.list,
  getAdminAssessmentDetail: mocks.detail,
  updateAdminAssessment: mocks.update,
}));

const cookieName = "test_admin_session";
const token = "opaque-admin-session-token";
const now = new Date("2026-09-15T12:00:00.000Z");
const admin: AdminDocument = {
  _id: new ObjectId(), email: "admin@example.com", passwordHash: "unused-hash", role: "admin",
  active: true, createdAt: now, updatedAt: now,
};
const session: AdminSessionDocument = {
  _id: new ObjectId(), adminId: admin._id, sessionTokenHash: hashSecret(token), createdAt: now,
  expiresAt: new Date("2026-09-16T12:00:00.000Z"),
};
const assessmentId = "507f1f77bcf86cd799439011";

const routes = [
  { name: "list", method: "GET", path: "/api/admin/assessments", call: listAssessments },
  {
    name: "detail", method: "GET", path: `/api/admin/assessments/${assessmentId}`,
    call: (request: NextRequest) => getAssessment(request, { params: Promise.resolve({ assessmentId }) }),
  },
  {
    name: "update", method: "PATCH", path: `/api/admin/assessments/${assessmentId}`,
    call: (request: NextRequest) => updateAssessment(request, { params: Promise.resolve({ assessmentId }) }),
  },
] as const;

function requestFor(route: (typeof routes)[number], withCookie = true) {
  return new NextRequest(`http://localhost${route.path}`, {
    method: route.method,
    headers: {
      ...(withCookie ? { cookie: `${cookieName}=${token}` } : {}),
      "Content-Type": "application/json",
    },
    ...(route.method === "PATCH" ? { body: JSON.stringify({ adminNotes: "Reviewed" }) } : {}),
  });
}

function expectNoAssessmentAccess() {
  expect(mocks.list).not.toHaveBeenCalled();
  expect(mocks.detail).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
}

function expectProtectedSessionLookup() {
  expect(mocks.findSession).toHaveBeenLastCalledWith({
    sessionTokenHash: hashSecret(token), expiresAt: { $gt: now }, invalidatedAt: { $exists: false },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  vi.stubEnv("ADMIN_SESSION_COOKIE_NAME", cookieName);
  mocks.cookieValue = token;
  mocks.readCookie.mockImplementation((name: string) =>
    name === cookieName && mocks.cookieValue ? { value: mocks.cookieValue } : undefined,
  );
  mocks.findSession.mockResolvedValue(session);
  mocks.findAdmin.mockResolvedValue(admin);
  mocks.list.mockResolvedValue({ assessments: [] });
  mocks.detail.mockResolvedValue({ success: true, data: { id: assessmentId } });
  mocks.update.mockResolvedValue({ success: true, data: { id: assessmentId, adminNotes: "Reviewed" } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("protected admin layout", () => {
  it.each(["missing", "unknown", "expired", "revoked", "inactive admin"])(
    "redirects to login instead of returning protected content for a %s session",
    async (state) => {
      if (state === "missing") mocks.cookieValue = undefined;
      if (state === "unknown" || state === "revoked") mocks.findSession.mockResolvedValue(null);
      if (state === "expired") mocks.findSession.mockResolvedValue({ ...session, expiresAt: now });
      if (state === "inactive admin") mocks.findAdmin.mockResolvedValue(null);

      await expect(ProtectedAdminLayout({ children: <p>Protected content</p> })).rejects.toThrow("NEXT_REDIRECT");
      expect(redirect).toHaveBeenCalledExactlyOnceWith("/admin/login");
      expect(mocks.readCookie).toHaveBeenCalledWith(cookieName);
      if (state === "missing") {
        expect(mocks.findSession).not.toHaveBeenCalled();
      } else {
        expectProtectedSessionLookup();
      }
      if (state === "inactive admin") {
        expect(mocks.findAdmin).toHaveBeenCalledWith({ _id: admin._id, active: true });
      }
      expectNoAssessmentAccess();
    },
  );

  it("renders protected content and the signed-in identity after one database-backed session check", async () => {
    const html = renderToStaticMarkup(await ProtectedAdminLayout({ children: <p>Protected content</p> }));
    expect(html).toContain("Protected content");
    expect(html).toContain("Signed in as admin@example.com");
    expect(html).toContain('aria-label="Admin navigation"');
    expect(html).not.toContain(token);
    expect(redirect).not.toHaveBeenCalled();
    expect(mocks.findSession).toHaveBeenCalledOnce();
    expectProtectedSessionLookup();
    expect(mocks.findAdmin).toHaveBeenCalledExactlyOnceWith({ _id: admin._id, active: true });
  });
});

describe("admin login page session outcomes", () => {
  it("renders login for a failed session result", async () => {
    mocks.cookieValue = undefined;
    const content = AdminLoginPage().type as () => Promise<ReactElement>;
    await expect(content()).resolves.toMatchObject({ type: "div" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("preserves the dashboard redirect for a successful session result", async () => {
    const content = AdminLoginPage().type as () => Promise<ReactElement>;
    await expect(content()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledExactlyOnceWith("/admin/dashboard");
  });
});

describe.each(routes)("admin $name API protection", (route) => {
  it("returns 401 without a cookie before reading or updating assessment data", async () => {
    const response = await route.call(requestFor(route, false));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { message: "Administrator authentication is required." } });
    expectNoAssessmentAccess();
    expect(mocks.findSession).not.toHaveBeenCalled();
  });

  it("checks the database independently and rejects a session revoked after layout rendering", async () => {
    await ProtectedAdminLayout({ children: null });
    mocks.findSession.mockResolvedValue(null);
    const response = await route.call(requestFor(route));
    expect(response.status).toBe(401);
    expectNoAssessmentAccess();
    expect(mocks.findSession).toHaveBeenCalledTimes(2);
    expectProtectedSessionLookup();
  });

  it("rejects an expired database session before accessing assessment data", async () => {
    mocks.findSession.mockResolvedValue({ ...session, expiresAt: now });
    expect((await route.call(requestFor(route))).status).toBe(401);
    expectNoAssessmentAccess();
    expectProtectedSessionLookup();
  });

  it("continues to permit a valid database-backed session without relying on the layout", async () => {
    const response = await route.call(requestFor(route));
    expect(response.status).toBe(200);
    expect(mocks.findSession).toHaveBeenCalledOnce();
    expectProtectedSessionLookup();
    expect(mocks.findAdmin).toHaveBeenCalledExactlyOnceWith({ _id: admin._id, active: true });
    expect(redirect).not.toHaveBeenCalled();
    if (route.name === "list") expect(mocks.list).toHaveBeenCalledOnce();
    if (route.name === "detail") expect(mocks.detail).toHaveBeenCalledExactlyOnceWith(assessmentId);
    if (route.name === "update") expect(mocks.update).toHaveBeenCalledExactlyOnceWith(assessmentId, { adminNotes: "Reviewed" });
  });
});
