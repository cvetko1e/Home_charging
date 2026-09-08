import type { NextRequest } from "next/server";
import { getAdminSessionCookieName } from "@/lib/env";
import { validateAdminSessionToken } from "@/services/adminAuth";
import { AssessmentServiceError } from "@/services/errors";

export async function requireAdminApiSession(request: NextRequest) {
  const sessionToken = request.cookies.get(getAdminSessionCookieName())?.value;
  const session = await validateAdminSessionToken(sessionToken);

  if (!session) {
    throw new AssessmentServiceError(401, "Administrator authentication is required.");
  }

  return session;
}
