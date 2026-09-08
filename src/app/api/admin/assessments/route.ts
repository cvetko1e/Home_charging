import { NextResponse, type NextRequest } from "next/server";
import { jsonFromError } from "@/app/api/_utils";
import { getAdminAssessmentList } from "@/services/adminAssessments";
import { requireAdminApiSession } from "@/services/adminApiAuth";
import { parseAssessmentListSearchParams } from "@/services/adminAssessments";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApiSession(request);

    const query = parseAssessmentListSearchParams(
      new URL(request.url).searchParams,
    );
    const result = await getAdminAssessmentList(query);

    return NextResponse.json(result);
  } catch (error) {
    return jsonFromError(error);
  }
}
