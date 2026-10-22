import { NextResponse, type NextRequest } from "next/server";
import { getWaitlistServices } from "@/server/waitlist";
import { handleWaitlistRequest, MAX_BODY_BYTES } from "@/server/waitlist/handler";

/**
 * POST /api/waitlist — stores interest in the pilot, only when collection is fully configured
 * (see .env.example). In the public demo it answers 503 not_configured and stores nothing.
 */
export async function POST(request: NextRequest) {
  const { config, store, limiter } = getWaitlistServices();

  // Refuse oversized bodies before reading them when the client declares a length.
  const declared = Number(request.headers.get("content-length") ?? "0");
  const rawBody = declared > MAX_BODY_BYTES ? "x".repeat(MAX_BODY_BYTES + 1) : await request.text();

  // The client key is used only by the rate limiter, in memory or by the platform; never logged.
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const result = await handleWaitlistRequest({
    config,
    rawBody,
    contentType: request.headers.get("content-type"),
    origin: request.headers.get("origin"),
    clientKey,
    store,
    limiter,
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store", ...result.headers },
  });
}
