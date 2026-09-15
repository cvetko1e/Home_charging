import { NextResponse, type NextRequest } from "next/server";
import { jsonFromServiceError, jsonFromError, readJsonBody } from "@/app/api/_utils";
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
    const session = await requireAdminApiSession(request);
    if (!session.success) return jsonFromServiceError(session.error);

    const { assessmentId } = await params;
    const result = await getAdminAssessmentDetail(assessmentId);

    if (!result.success) return jsonFromServiceError(result.error);
    return NextResponse.json({ assessment: result.data });
  } catch (error) {
    return jsonFromError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdminApiSession(request);
    if (!session.success) return jsonFromServiceError(session.error);

    const { assessmentId } = await params;
    const json = await readJsonBody(request);
    if (!json.success) return jsonFromServiceError(json.error);
    const updates = adminAssessmentUpdateSchema.parse(json.data);
    const result = await updateAdminAssessment(assessmentId, updates);

    if (!result.success) return jsonFromServiceError(result.error);
    return NextResponse.json({ assessment: result.data });
  } catch (error) {
    return jsonFromError(error);
  }
}
