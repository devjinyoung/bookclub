import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  // Auth logic will be implemented in Phase 2.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/nominations",
    "/archive",
    "/members",
    "/profile/:path*",
  ],
};

