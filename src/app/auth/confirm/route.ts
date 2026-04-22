import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(rawNext: string | null): string {
  if (!rawNext) return "/reset-password";
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return "/reset-password";
  return rawNext;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next"));

  const supabase = await createClient();

  if (tokenHash && type) {
    const otpType = type as EmailOtpType;
    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return NextResponse.redirect(
      new URL(
        `/reset-password?error=${encodeURIComponent(error.message)}`,
        url.origin,
      ),
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return NextResponse.redirect(
      new URL(
        `/reset-password?error=${encodeURIComponent(error.message)}`,
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      "/reset-password?error=Recovery+link+is+invalid+or+expired",
      url.origin,
    ),
  );
}
