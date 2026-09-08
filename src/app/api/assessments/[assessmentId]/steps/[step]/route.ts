import { NextResponse } from "next/server";
import { jsonFromError, readJsonBody } from "@/app/api/_utils";
import { saveAssessmentStep } from "@/services/assessments";
import {
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

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const routeParams = saveStepRouteParamsSchema.parse(await params);
    const body = saveStepRequestSchema.parse(await readJsonBody(request));
    const data = getSurveyStepSchema(routeParams.step).parse(body.data);
    const assessment = await saveAssessmentStep(
      routeParams.assessmentId,
      body.resumeToken,
      routeParams.step,
      data,
    );

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonFromError(error);
  }
}
