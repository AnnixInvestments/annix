import { isString } from "es-toolkit/compat";
import { NextResponse } from "next/server";

// Returns the build id of the CURRENTLY DEPLOYED server. A stale open tab polls
// this and compares it against the NEXT_PUBLIC_APP_BUILD_ID baked into its own
// (older) bundle; a mismatch means a new version is live. Must never be cached.
export const dynamic = "force-dynamic";

const BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID;

export function GET() {
  const buildId = isString(BUILD_ID) ? BUILD_ID : "";
  return NextResponse.json(
    { buildId },
    { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } },
  );
}
