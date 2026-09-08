import { NextResponse } from "next/server";
import { jsonFromError, readJsonBody } from "@/app/api/_utils";
import { completeAssessment } from "@/services/assessments";
import {
  assessmentRouteParamsSchema,
  completeAssessmentRequestSchema,
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
    const body = completeAssessmentRequestSchema.parse(
      await readJsonBody(request),
    );
    const assessment = await completeAssessment(assessmentId, body.resumeToken);

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonFromError(error);
  }
}
