import { NextResponse, type NextRequest } from "next/server";
import { jsonFromServiceError, jsonFromError } from "@/app/api/_utils";
import { getAdminAssessmentList } from "@/services/adminAssessments";
import { requireAdminApiSession } from "@/services/adminApiAuth";
import { parseAssessmentListSearchParams } from "@/services/adminAssessments";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminApiSession(request);
    if (!session.success) return jsonFromServiceError(session.error);

    const query = parseAssessmentListSearchParams(
      new URL(request.url).searchParams,
    );
    if (!query.success) return jsonFromServiceError(query.error);
    const result = await getAdminAssessmentList(query.data);

    return NextResponse.json(result);
  } catch (error) {
    return jsonFromError(error);
  }
}
