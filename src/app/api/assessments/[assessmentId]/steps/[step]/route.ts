import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonFromServiceError, jsonFromError, readJsonBody } from "@/app/api/_utils";
import {
  getAssessmentResumeCookieName,
  readAssessmentResumeToken,
} from "@/lib/assessmentResumeCookie";
import { saveAssessmentStep } from "@/services/assessments";
import {
  authorizationSchema,
  getSurveyStepSchema,
  saveStepRequestSchema,
  saveStepRouteParamsSchema,
} from "@/validation/assessment";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    assessmentId: string;
    step: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const routeParams = saveStepRouteParamsSchema.parse(await params);
    const json = await readJsonBody(request);
    if (!json.success) return jsonFromServiceError(json.error);
    const body = saveStepRequestSchema.parse(json.data);
    const data = getSurveyStepSchema(routeParams.step).parse(body.data);
    const resumeToken =
      readAssessmentResumeToken(
        request.cookies.get(getAssessmentResumeCookieName())?.value,
        routeParams.assessmentId,
      ) ?? body.resumeToken;

    if (!resumeToken) {
      return jsonFromServiceError({
        code: "AUTH_REQUIRED",
        message: "A resume session or token is required.",
      });
    }

    authorizationSchema.parse({ resumeToken });

    const result = await saveAssessmentStep(
      routeParams.assessmentId,
      resumeToken,
      routeParams.step,
      data,
    );

    if (!result.success) return jsonFromServiceError(result.error);
    return NextResponse.json({ assessment: result.data });
  } catch (error) {
    return jsonFromError(error);
  }
}
