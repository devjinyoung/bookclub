import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function hasAuthCookie(req: NextRequest) {
  return req.cookies.has("bookclub-auth");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isProtectedRoute =
    pathname === "/" ||
    pathname.startsWith("/nominations") ||
    pathname.startsWith("/archive") ||
    pathname.startsWith("/members") ||
    pathname.startsWith("/profile");

  const isAuthenticated = hasAuthCookie(req);
  console.log({isAuthenticated});
  // If not logged in and hitting a protected route, send to /login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and hitting /login or /signup, redirect home
  if (isAuthenticated && isAuthRoute) {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/nominations/:path*",
    "/archive/:path*",
    "/members/:path*",
    "/profile/:path*",
    "/login",
    "/signup",
  ],
};


