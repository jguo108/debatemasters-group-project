import { createServerClient } from "@supabase/ssr";
import { NextResponse, NextRequest } from "next/server";
import { DEBATEMASTER_PATH_HEADER } from "@/lib/auth/path-header";

/** Only these URL prefixes (plus `/` exactly) are reachable without a Supabase session. */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/register")) return true;
  if (pathname.startsWith("/reset-password")) return true;
  if (pathname.startsWith("/auth/")) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const headersWithPath = new Headers(request.headers);
  headersWithPath.set(DEBATEMASTER_PATH_HEADER, pathname);
  const requestWithPath = new NextRequest(request.url, {
    headers: headersWithPath,
  });

  let supabaseResponse = NextResponse.next({ request: requestWithPath });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return requestWithPath.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          requestWithPath.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request: requestWithPath });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    const returnTo = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("redirect", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
