"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import { migrateLocalDataToSupabaseIfNeeded } from "@/lib/data/local-migration";
import { pickMinecraftAvatarBySeed } from "@/lib/data/profile-storage";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";

function formatSignUpError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already") ||
    lower.includes("email address is already")
  ) {
    return "That email is already registered in Auth (not just the profile table). Use Log In with the same password, or in Supabase Dashboard open Authentication → Users, delete that user, then you can sign up again.";
  }
  return message;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoinArena() {
    setError(null);
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    const name = displayName.trim().slice(0, 24);
    if (!email.trim() || !password || password.length < 6) {
      setError("Enter email, password (min 6 characters), and player name.");
      return;
    }
    if (!name) {
      setError("Enter a player name.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const avatarUrl = pickMinecraftAvatarBySeed(email.trim() + name);
      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: name,
            avatar_url: avatarUrl,
          },
        },
      });
      if (signError) {
        setError(formatSignUpError(signError.message));
        return;
      }
      if (data.session?.user) {
        await supabase
          .from("profiles")
          .update({
            display_name: name,
            avatar_url: avatarUrl,
          })
          .eq("id", data.session.user.id);
      }
      if (data.session) {
        await migrateLocalDataToSupabaseIfNeeded();
        router.push("/onboarding");
        router.refresh();
      } else {
        setError(
          "Check your email to confirm your account, then return here to log in.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-stone-950 font-headline-pixel">
      <div className="fixed inset-0 z-0">
        <img
          alt=""
          className="h-full w-full object-cover opacity-60 mix-blend-multiply"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWHLIPMZk8okq_po_SU4tMFq12VjPTr0EadH_CRZVrG9N1eCak5kxqdcigekqODLvAXoh1LbQGimrSekl5QdCEQDFMWg79i4oWsEFmJ8Cqv0VnHK0XBUVsYE69cHHvpelWbRuCM4nsmY9RZo-Um7ePia408GTIiekT0IHzot8lwacbrAicLXe_Za_5QLIOIVW3e0OmUmeikZVb0CnWTsJSn6WcDUKNmSzjXJ5rn8EplUxWueFWu4uJihdB3Wpkz3lQGrkuJt0lbyl"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-red-900/40 via-transparent to-stone-950/80" />
        <div className="absolute bottom-0 h-1/3 w-full bg-gradient-to-t from-orange-600/20 to-transparent" />
      </div>
      <main className="relative z-10 flex w-full max-w-4xl flex-col items-center p-8">
        <div className="voxel-shadow relative w-full max-w-lg overflow-hidden border-[6px] border-stone-950 bg-stone-900">
          <div className="flex h-16 w-full items-center justify-between border-b-[6px] border-stone-950 bg-stone-800 px-6">
            <div className="flex items-center gap-3">
              <MaterialIcon name="person_add" className="text-orange-500" filled />
              <span className="brick-sans pixel-text-base font-bold uppercase tracking-tight text-stone-200">
                Create Player ID
              </span>
            </div>
            <div className="flex gap-1">
              <div className="h-3 w-3 bg-red-600" />
              <div className="h-3 w-3 bg-orange-500" />
            </div>
          </div>
          <div
            className="space-y-8 bg-stone-900 p-8"
            style={{
              backgroundImage:
                "url('https://www.transparenttextures.com/patterns/dark-matter.png')",
            }}
          >
            <div className="flex flex-col items-stretch gap-6 md:flex-row md:items-start">
              <div className="group relative mx-auto h-32 w-32 flex-shrink-0 border-4 border-stone-950 bg-stone-800 md:mx-0">
                <img
                  alt=""
                  className="h-full w-full object-cover brightness-75 grayscale transition-all duration-300 group-hover:grayscale-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVfPS3hsP2JvHRRSsT7al78H2KUNFNurf_r4nUcNb3LLVqJ47BbQqjlqDNXC_PLWgohjrgTx5ewjb3KJVWE6D3hg1aRUB3z7NueZDYows-sYdS2Rzeqa2mqS_QegQtVW9csYfLIJUfsBr_zkRkpcJFxD8Wr5XDuAmN5ru4BSrCrmoBZgN61NAJCr5_LS9pc7sDmET_SUokKiolCDsgOI89UXxKczjifWfsauJW3bxqNbQOD4PPi6etpiaRk7hn-zeBQ0zniHWR2D_2"
                />
                <div className="pointer-events-none absolute inset-0 border-2 border-white/5" />
                <div className="absolute -bottom-2 -right-2 bg-green-500 p-1 text-stone-950">
                  <MaterialIcon name="add_a_photo" className="block text-sm" />
                </div>
              </div>
              <div className="w-full space-y-4 md:flex-grow">
                <div className="space-y-2">
                  <label
                    htmlFor="reg-email"
                    className="pixel-text-xs block font-bold uppercase tracking-widest text-orange-500"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="reg-email"
                      className="brick-sans voxel-inset w-full border-none bg-stone-950 py-3 px-4 pixel-text-sm font-bold uppercase text-white placeholder:text-stone-700 focus:ring-4 focus:ring-green-500/30"
                      placeholder="you@example.com"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="reg-password"
                    className="pixel-text-xs block font-bold uppercase tracking-widest text-orange-500"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      className="brick-sans voxel-inset w-full border-none bg-stone-950 py-3 px-4 pixel-text-sm font-bold text-white placeholder:text-stone-700 focus:ring-4 focus:ring-green-500/30"
                      placeholder="••••••••"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="reg-name"
                    className="pixel-text-xs block font-bold uppercase tracking-widest text-orange-500"
                  >
                    Player Name
                  </label>
                  <div className="relative">
                    <input
                      id="reg-name"
                      className="brick-sans voxel-inset w-full border-none bg-stone-950 py-3 px-4 pixel-text-sm font-bold uppercase text-white placeholder:text-stone-700 focus:ring-4 focus:ring-green-500/30"
                      placeholder="NEW_USERNAME"
                      type="text"
                      maxLength={24}
                      autoComplete="nickname"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            {error ? (
              <p className="border-2 border-orange-800 bg-stone-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-200">
                {error}
              </p>
            ) : null}
            <div className="flex flex-col gap-4">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleJoinArena()}
                className="brick-sans block w-full text-center voxel-shadow-small border-t-4 border-green-400 bg-green-600 py-4 pixel-text-base font-black uppercase tracking-tighter text-stone-950 transition-all duration-75 hover:bg-green-500 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-60"
              >
                {loading ? "..." : "JOIN ARENA"}
              </button>
              <div className="flex items-center justify-between px-1">
                <span className="pixel-text-xs font-bold uppercase tracking-widest text-stone-600">
                  Already spawned?
                </span>
                <div className="mx-4 h-[2px] flex-grow bg-stone-800" />
                <Link
                  href="/login"
                  className="pixel-text-xs font-bold uppercase tracking-widest text-orange-500 transition-colors hover:text-orange-400"
                >
                  Log In
                </Link>
              </div>
            </div>
          </div>
          <div className="flex h-3 w-full overflow-hidden bg-stone-950">
            <div className="h-full w-1/4 bg-green-900" />
            <div className="h-full w-1/4 bg-green-700" />
            <div className="h-full w-1/4 bg-green-500" />
            <div className="h-full w-1/4 bg-green-300" />
          </div>
        </div>
      </main>
      <div className="pointer-events-none fixed inset-0 z-20 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]" />
    </div>
  );
}
