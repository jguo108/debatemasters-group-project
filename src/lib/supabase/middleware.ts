import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Paths that require a signed-in user (prefix match: `/x` matches `/x`, `/x/y`, …). */
const AUTH_REQUIRED_PREFIXES = ["/onboarding"] as const;

function isAuthRequiredPath(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/reset-password")
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (
    user === null &&
    isAuthRequiredPath(pathname) &&
    !isPublicAuthPath(pathname)
  ) {
    const loginUrl = new URL("/login", request.url);
    const returnTo = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("redirect", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
