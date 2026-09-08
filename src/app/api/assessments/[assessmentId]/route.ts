import { NextResponse } from "next/server";
import { jsonError, jsonFromError } from "@/app/api/_utils";
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

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { assessmentId } = assessmentRouteParamsSchema.parse(await params);
    const resumeToken = request.headers.get("x-resume-token");

    if (!resumeToken) {
      return jsonError("A resume token is required.", 401);
    }

    authorizationSchema.parse({ resumeToken });

    const assessment = await getAuthorizedAssessment(assessmentId, resumeToken);

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonFromError(error);
  }
}
