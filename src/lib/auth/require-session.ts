import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEBATEMASTER_PATH_HEADER } from "@/lib/auth/path-header";

/**
 * Redirects to `/login` when Supabase is configured and there is no session.
 * Pass `returnPath` when middleware may not run (e.g. webpack dev) so post-login return is correct.
 */
export async function requireSession(returnPath?: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return;

  let path = returnPath?.trim();
  if (!path) {
    const h = await headers();
    path = h.get(DEBATEMASTER_PATH_HEADER) ?? "/";
  }
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  redirect(`/login?redirect=${encodeURIComponent(safe)}`);
}
