import type { NextRequest } from "next/server";
import { getAdminSessionCookieName } from "@/lib/env";
import { validateAdminSessionToken } from "@/services/adminAuth";
import type { AdminSession } from "@/types/admin";
import type { Result } from "@/types/result";

export async function requireAdminApiSession(request: NextRequest): Promise<Result<AdminSession>> {
  const sessionToken = request.cookies.get(getAdminSessionCookieName())?.value;
  return validateAdminSessionToken(sessionToken);
}
