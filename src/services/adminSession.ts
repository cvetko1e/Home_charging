import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSessionCookieName } from "@/lib/env";
import { validateAdminSessionToken } from "@/services/adminAuth";
import type { AdminSession } from "@/types/admin";
import type { Result } from "@/types/result";

export async function getCurrentAdminSession(): Promise<Result<AdminSession>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminSessionCookieName())?.value;

  return validateAdminSessionToken(token);
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getCurrentAdminSession();

  if (!session.success) {
    redirect("/admin/login");
  }

  return session.data;
}
