import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonFromServiceError, jsonFromError, readJsonBody } from "@/app/api/_utils";
import {
  getAssessmentResumeCookieName,
  getExpiredAssessmentResumeCookieOptions,
  readAssessmentResumeToken,
} from "@/lib/assessmentResumeCookie";
import { completeAssessment } from "@/services/assessments";
import {
  assessmentRouteParamsSchema,
  authorizationSchema,
  completeAssessmentRequestSchema,
} from "@/validation/assessment";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    assessmentId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { assessmentId } = assessmentRouteParamsSchema.parse(await params);
    const json = await readJsonBody(request);
    if (!json.success) return jsonFromServiceError(json.error);
    const body = completeAssessmentRequestSchema.parse(
      json.data,
    );
    const resumeToken =
      readAssessmentResumeToken(
        request.cookies.get(getAssessmentResumeCookieName())?.value,
        assessmentId,
      ) ?? body.resumeToken;

    if (!resumeToken) {
      return jsonFromServiceError({
        code: "AUTH_REQUIRED",
        message: "A resume session or token is required.",
      });
    }

    authorizationSchema.parse({ resumeToken });

    const result = await completeAssessment(assessmentId, resumeToken);
    if (!result.success) return jsonFromServiceError(result.error);
    const response = NextResponse.json({ assessment: result.data });

    response.cookies.set(
      getAssessmentResumeCookieName(),
      "",
      getExpiredAssessmentResumeCookieOptions(),
    );

    return response;
  } catch (error) {
    return jsonFromError(error);
  }
}
