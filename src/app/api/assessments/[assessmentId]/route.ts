import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonFromServiceError, jsonFromError } from "@/app/api/_utils";
import {
  getAssessmentResumeCookieName,
  readAssessmentResumeToken,
} from "@/lib/assessmentResumeCookie";
import { getAuthorizedAssessment } from "@/services/assessments";
import {
  assessmentRouteParamsSchema,
  authorizationSchema,
} from "@/validation/assessment";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    assessmentId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { assessmentId } = assessmentRouteParamsSchema.parse(await params);
    const resumeToken =
      readAssessmentResumeToken(
        request.cookies.get(getAssessmentResumeCookieName())?.value,
        assessmentId,
      ) ?? request.headers.get("x-resume-token");

    if (!resumeToken) {
      return jsonFromServiceError({
        code: "AUTH_REQUIRED",
        message: "A resume session or token is required.",
      });
    }

    authorizationSchema.parse({ resumeToken });

    const result = await getAuthorizedAssessment(assessmentId, resumeToken);

    if (!result.success) return jsonFromServiceError(result.error);
    return NextResponse.json({ assessment: result.data });
  } catch (error) {
    return jsonFromError(error);
  }
}
