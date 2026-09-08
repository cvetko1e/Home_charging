import { NextResponse, type NextRequest } from "next/server";
import { jsonFromError } from "@/app/api/_utils";
import { getAdminSessionCookieName } from "@/lib/env";
import { logoutAdmin } from "@/services/adminAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const cookieName = getAdminSessionCookieName();
    await logoutAdmin(request.cookies.get(cookieName)?.value);

    const response = NextResponse.json({ ok: true });

    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    return jsonFromError(error);
  }
}
