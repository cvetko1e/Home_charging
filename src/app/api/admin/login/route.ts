import { NextResponse } from "next/server";
import { jsonFromError, readJsonBody } from "@/app/api/_utils";
import { getAdminSessionCookieName } from "@/lib/env";
import { loginAdmin } from "@/services/adminAuth";
import { adminLoginSchema } from "@/validation/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const credentials = adminLoginSchema.parse(await readJsonBody(request));
    const result = await loginAdmin(credentials.email, credentials.password);
    const response = NextResponse.json({
      admin: result.admin,
    });

    response.cookies.set(getAdminSessionCookieName(), result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: result.expiresAt,
    });

    return response;
  } catch (error) {
    return jsonFromError(error);
  }
}
