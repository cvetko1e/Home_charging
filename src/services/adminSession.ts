import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSessionCookieName } from "@/lib/env";
import { validateAdminSessionToken } from "@/services/adminAuth";
import type { AdminSession } from "@/types/admin";

export async function getCurrentAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminSessionCookieName())?.value;

  return validateAdminSessionToken(token);
}

export async function requireAdminSession() {
  const session = await getCurrentAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
