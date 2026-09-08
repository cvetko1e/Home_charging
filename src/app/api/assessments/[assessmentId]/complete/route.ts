import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { jsonFromError, readJsonBody } from "@/app/api/_utils";
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
    const body = completeAssessmentRequestSchema.parse(
      await readJsonBody(request),
    );
    const resumeToken =
      readAssessmentResumeToken(
        request.cookies.get(getAssessmentResumeCookieName())?.value,
        assessmentId,
      ) ?? body.resumeToken;

    if (!resumeToken) {
      return jsonError("A resume session or token is required.", 401);
    }

    authorizationSchema.parse({ resumeToken });

    const assessment = await completeAssessment(assessmentId, resumeToken);
    const response = NextResponse.json({ assessment });

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
