import { NextResponse } from "next/server";
import { jsonFromError } from "@/app/api/_utils";
import { createAssessmentDraft } from "@/services/assessments";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await createAssessmentDraft();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonFromError(error);
  }
}
