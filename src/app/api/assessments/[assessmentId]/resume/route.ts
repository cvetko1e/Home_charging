import { NextResponse } from "next/server";
import { jsonFromServiceError, jsonFromError, readJsonBody } from "@/app/api/_utils";
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
    const json = await readJsonBody(request);
    if (!json.success) return jsonFromServiceError(json.error);
    const { resumeToken } = authorizationSchema.parse(json.data);
    const result = await getAuthorizedAssessment(assessmentId, resumeToken);
    if (!result.success) return jsonFromServiceError(result.error);
    const response = NextResponse.json({ assessment: result.data });

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
