/**
 * Browser Supabase client — wire this when you add `@supabase/supabase-js`
 * and Vercel environment variables.
 *
 * import { createBrowserClient } from "@supabase/ssr";
 * export function createClient() {
 *   return createBrowserClient(
 *     process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *   );
 * }
 */

export function createBrowserClient() {
  throw new Error(
    "Supabase client not configured. Install @supabase/ssr and set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}
