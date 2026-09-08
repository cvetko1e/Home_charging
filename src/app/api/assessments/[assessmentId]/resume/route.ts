import { NextResponse } from "next/server";
import { jsonFromError, readJsonBody } from "@/app/api/_utils";
import {
  createAssessmentResumeCookieValue,
  getAssessmentResumeCookieName,
  getAssessmentResumeCookieOptions,
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

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { assessmentId } = assessmentRouteParamsSchema.parse(await params);
    const { resumeToken } = authorizationSchema.parse(await readJsonBody(request));
    const assessment = await getAuthorizedAssessment(assessmentId, resumeToken);
    const response = NextResponse.json({ assessment });

    response.cookies.set(
      getAssessmentResumeCookieName(),
      createAssessmentResumeCookieValue(assessmentId, resumeToken),
      getAssessmentResumeCookieOptions(),
    );

    return response;
  } catch (error) {
    return jsonFromError(error);
  }
}
