"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function initializeRecoverySession() {
      let setupError: string | null = null;
      const initialQuery = new URLSearchParams(window.location.search);
      const initialError = initialQuery.get("error");
      if (initialError) {
        setError(initialError);
      }
      if (!isSupabaseConfigured()) {
        setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        setReady(true);
        return;
      }

      const supabase = createClient();
      const query = new URLSearchParams(window.location.search);
      const code = query.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setupError = exchangeError.message;
        }
      }

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashQuery = new URLSearchParams(hash);
      const accessToken = hashQuery.get("access_token");
      const refreshToken = hashQuery.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setupError = sessionError.message;
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session && !setupError) {
        setupError = "Recovery link is invalid or expired. Request a new reset email from the login page.";
      }
      if (setupError) {
        setError(setupError);
      }

      setReady(true);
    }

    void initializeRecoverySession();
  }, []);

  async function handleResetPassword() {
    setError(null);
    setNotice(null);
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setNotice("Password updated successfully. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1200);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 p-6 font-headline-pixel">
      <section className="w-full max-w-md border-[6px] border-stone-950 bg-stone-900">
        <div className="border-b-[6px] border-stone-950 bg-stone-800 px-6 py-4">
          <h1 className="pixel-text-base font-bold uppercase tracking-tight text-stone-200">
            Reset Password
          </h1>
        </div>
        <div className="space-y-4 p-6">
          <p className="brick-sans text-sm text-stone-300">
            Use the link from your email, then set a new password below.
          </p>

          <label className="block space-y-2">
            <span className="pixel-text-xs font-bold uppercase tracking-widest text-orange-500">
              New Password
            </span>
            <input
              className="brick-sans voxel-inset w-full border-none bg-stone-950 px-4 py-3 pixel-text-sm font-bold text-white placeholder:text-stone-700 focus:ring-4 focus:ring-green-500/30"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!ready || loading}
            />
          </label>

          <label className="block space-y-2">
            <span className="pixel-text-xs font-bold uppercase tracking-widest text-orange-500">
              Confirm Password
            </span>
            <input
              className="brick-sans voxel-inset w-full border-none bg-stone-950 px-4 py-3 pixel-text-sm font-bold text-white placeholder:text-stone-700 focus:ring-4 focus:ring-green-500/30"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={!ready || loading}
            />
          </label>

          {error ? (
            <p className="border-2 border-red-800 bg-red-950/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-200">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="border-2 border-green-800 bg-green-950/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-green-200">
              {notice}
            </p>
          ) : null}

          <button
            type="button"
            className="brick-sans block w-full voxel-shadow-small border-t-4 border-green-400 bg-green-600 py-3 text-center pixel-text-base font-black uppercase tracking-tighter text-stone-950 transition-all duration-75 hover:bg-green-500 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-60"
            onClick={() => void handleResetPassword()}
            disabled={!ready || loading}
          >
            {loading ? "..." : "Update Password"}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="pixel-text-xs font-bold uppercase tracking-widest text-orange-500 transition-colors hover:text-orange-400"
            >
              Back To Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
