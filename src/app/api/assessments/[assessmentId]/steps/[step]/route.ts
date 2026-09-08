import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonFromError, readJsonBody } from "@/app/api/_utils";
import { jsonError } from "@/app/api/_utils";
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
    const body = saveStepRequestSchema.parse(await readJsonBody(request));
    const data = getSurveyStepSchema(routeParams.step).parse(body.data);
    const resumeToken =
      readAssessmentResumeToken(
        request.cookies.get(getAssessmentResumeCookieName())?.value,
        routeParams.assessmentId,
      ) ?? body.resumeToken;

    if (!resumeToken) {
      return jsonError("A resume session or token is required.", 401);
    }

    authorizationSchema.parse({ resumeToken });

    const assessment = await saveAssessmentStep(
      routeParams.assessmentId,
      resumeToken,
      routeParams.step,
      data,
    );

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonFromError(error);
  }
}
