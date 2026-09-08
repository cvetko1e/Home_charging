import { NextResponse } from "next/server";
import { jsonFromError } from "@/app/api/_utils";
import {
  createAssessmentResumeCookieValue,
  getAssessmentResumeCookieName,
  getAssessmentResumeCookieOptions,
} from "@/lib/assessmentResumeCookie";
import { createAssessmentDraft } from "@/services/assessments";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await createAssessmentDraft();
    const response = NextResponse.json(
      { assessment: result.assessment },
      { status: 201 },
    );

    response.cookies.set(
      getAssessmentResumeCookieName(),
      createAssessmentResumeCookieValue(
        result.assessment.id,
        result.resumeToken,
      ),
      getAssessmentResumeCookieOptions(),
    );

    return response;
  } catch (error) {
    return jsonFromError(error);
  }
}
