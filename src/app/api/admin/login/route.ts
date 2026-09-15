import { NextResponse } from "next/server";
import { jsonFromServiceError, jsonFromError, readJsonBody } from "@/app/api/_utils";
import { getAdminSessionCookieName } from "@/lib/env";
import { loginAdmin } from "@/services/adminAuth";
import { adminLoginSchema } from "@/validation/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await readJsonBody(request);
    if (!json.success) return jsonFromServiceError(json.error);
    const credentials = adminLoginSchema.parse(json.data);
    const result = await loginAdmin(credentials.email, credentials.password);
    if (!result.success) return jsonFromServiceError(result.error);
    const response = NextResponse.json({
      admin: result.data.admin,
    });

    response.cookies.set(getAdminSessionCookieName(), result.data.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: result.data.expiresAt,
    });

    return response;
  } catch (error) {
    return jsonFromError(error);
  }
}
