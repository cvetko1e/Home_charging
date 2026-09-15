import { NextResponse } from "next/server";
import { jsonFromError, jsonFromServiceError } from "@/app/api/_utils";
import { getChargerCatalog } from "@/services/catalogs";
import type { ChargersResponse } from "@/types/catalogs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const result = await getChargerCatalog();
    if (!result.success) {
      const response = jsonFromServiceError(result.error);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    return NextResponse.json<ChargersResponse>(result.data, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    });
  } catch (error) {
    const response = jsonFromError(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
