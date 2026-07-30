import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function redirectWithSessionCookies(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  // Preserve any cookies written during getUser() token refresh.
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Verifies the session against Supabase Auth (not just a locally-set flag),
  // so this can't be bypassed by forging a cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  const isProtectedRoute =
    pathname === '/' ||
    pathname.startsWith('/nominations') ||
    pathname.startsWith('/archive') ||
    pathname.startsWith('/members') ||
    pathname.startsWith('/profile');

  // If not logged in and hitting a protected route, send to /login
  if (!user && isProtectedRoute) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return redirectWithSessionCookies(loginUrl, response);
  }

  // If logged in and hitting /login or /signup, redirect home
  if (user && isAuthRoute) {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = '/';
    return redirectWithSessionCookies(homeUrl, response);
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/nominations/:path*',
    '/archive/:path*',
    '/members/:path*',
    '/profile/:path*',
    '/login',
    '/signup',
  ],
};
