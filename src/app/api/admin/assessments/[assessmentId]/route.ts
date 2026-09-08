import { NextResponse, type NextRequest } from "next/server";
import { jsonFromError, readJsonBody } from "@/app/api/_utils";
import { getAdminAssessmentDetail, updateAdminAssessment } from "@/services/adminAssessments";
import { requireAdminApiSession } from "@/services/adminApiAuth";
import { adminAssessmentUpdateSchema } from "@/validation/admin";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    assessmentId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdminApiSession(request);

    const { assessmentId } = await params;
    const assessment = await getAdminAssessmentDetail(assessmentId);

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonFromError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdminApiSession(request);

    const { assessmentId } = await params;
    const updates = adminAssessmentUpdateSchema.parse(await readJsonBody(request));
    const assessment = await updateAdminAssessment(assessmentId, updates);

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonFromError(error);
  }
}
