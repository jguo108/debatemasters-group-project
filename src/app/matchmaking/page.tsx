"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NetherSidebarShell } from "@/components/layout/NetherSidebarShell";
import { OnboardingSidebar } from "@/components/sidebars/OnboardingSidebar";
import { MaterialIcon } from "@/components/MaterialIcon";
import { pickRandomMatchTopic } from "@/lib/debate/random-match-topics";
import { parseArenaMatchRpcResult } from "@/lib/matchmaking/arena";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";

const SEARCH_DURATION_MS = 60_000;
const TICK_MS = SEARCH_DURATION_MS / 100;

export default function MatchmakingPage() {
  const router = useRouter();
  const [pct, setPct] = useState(0);
  const [matched, setMatched] = useState(false);
  const doneRef = useRef(false);
  const [arenaAuthChecked, setArenaAuthChecked] = useState(!isSupabaseConfigured());
  const [arenaAuthed, setArenaAuthed] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const searchStartedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        router.replace("/login?redirect=/matchmaking");
        return;
      }
      setArenaAuthed(true);
      setArenaAuthChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (isSupabaseConfigured()) return;
    let intervalId: number | undefined;
    let navigateTimeoutId: number | undefined;
    let current = 0;

    intervalId = window.setInterval(() => {
      if (doneRef.current) return;
      current += 1;
      setPct(current * 10);
      if (current === 10) {
        doneRef.current = true;
        if (intervalId !== undefined) window.clearInterval(intervalId);
        intervalId = undefined;
        setMatched(true);
        navigateTimeoutId = window.setTimeout(() => {
          const topic = pickRandomMatchTopic();
          router.push(
            `/debate?topic=custom&title=${encodeURIComponent(topic)}&format=wsda`,
          );
        }, 1000);
      }
    }, TICK_MS);

    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
      if (navigateTimeoutId !== undefined) window.clearTimeout(navigateTimeoutId);
    };
  }, [router]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !arenaAuthed) return;

    const supabase = createClient();
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function goToRoom(roomId: string) {
      if (doneRef.current) return;
      doneRef.current = true;
      setMatched(true);
      setPct(100);
      router.push(`/debate?room=${encodeURIComponent(roomId)}&format=wsda&topic=custom`);
    }

    async function tick() {
      const { data, error } = await supabase.rpc("arena_request_match");
      if (cancelled) return;
      if (error) {
        console.warn("arena_request_match:", error.message);
        setMatchError(error.message);
        return;
      }
      setMatchError(null);
      const parsed = parseArenaMatchRpcResult(data);
      if (parsed.status === "error") {
        console.warn("arena match parse:", parsed.message, data);
        setMatchError(parsed.message);
        return;
      }
      if (parsed.status === "matched") {
        goToRoom(parsed.room_id);
      }
    }

    void (async () => {
      const { error: beginErr } = await supabase.rpc("arena_begin_matchmaking");
      if (cancelled) return;
      if (beginErr) {
        console.warn("arena_begin_matchmaking:", beginErr.message);
        setMatchError(beginErr.message);
        return;
      }
      await tick();
    })();

    pollId = setInterval(() => void tick(), 800);

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return;
      channel = supabase
        .channel(`arena_queue_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "arena_queue",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as { status?: string; room_id?: string | null };
            if (row?.status === "matched" && row.room_id) {
              goToRoom(row.room_id);
            }
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (pollId !== undefined) clearInterval(pollId);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [arenaAuthed, router]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !arenaAuthed || matched) return;
    searchStartedAt.current = Date.now();
    const id = window.setInterval(() => {
      if (doneRef.current) return;
      const elapsed = Date.now() - searchStartedAt.current;
      setPct(Math.min(95, Math.floor((elapsed / 120_000) * 100)));
    }, 400);
    return () => window.clearInterval(id);
  }, [arenaAuthed, matched]);

  async function cancelQueueAndGo(href: string) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.rpc("arena_cancel_queue");
      } catch {
        /* ignore */
      }
    }
    router.push(href);
  }

  if (isSupabaseConfigured() && !arenaAuthChecked) {
    return (
      <div className="overflow-hidden bg-surface font-[family-name:var(--font-inter)] text-on-surface">
        <NetherSidebarShell sidebar={<OnboardingSidebar />}>
          <main className="matchmaking-nether-bg relative flex h-[100dvh] items-center justify-center md:h-screen">
            <p className="brick-sans text-sm font-black uppercase text-white">Loading…</p>
          </main>
        </NetherSidebarShell>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-surface font-[family-name:var(--font-inter)] text-on-surface">
      <NetherSidebarShell sidebar={<OnboardingSidebar />}>
        <main className="matchmaking-nether-bg relative flex h-[100dvh] items-center justify-center md:h-screen">
          <div className="pixel-overlay-match absolute inset-0 opacity-40" />
          <div className="voxel-vignette absolute inset-0" />
          <div className="nether-haze-match absolute inset-0" />
          <div className="lava-glow-block absolute top-20 right-20 hidden h-16 w-16 border-4 border-[#1c0808] bg-[#2d0d0d] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.7)] lg:block" />
          <div className="absolute bottom-20 left-40 hidden h-24 w-24 border-4 border-black bg-[#3d1111] shadow-[12px_12px_0px_0px_rgba(0,0,0,0.7)] lg:block" />
          <div className="lava-glow-block absolute right-1/4 bottom-40 hidden h-12 w-12 border-4 border-red-950 bg-red-900/30 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] lg:block" />

          <section className="relative z-10 flex w-full max-w-2xl flex-col items-center px-6 pb-24 md:pb-6">
            <div className="mb-12 relative">
              <div className="flex h-32 w-32 items-center justify-center border-t-4 border-l-4 border-red-900 bg-[#4a1010] shadow-[10px_10px_0px_0px_rgba(0,0,0,0.7)]">
                <MaterialIcon
                  name={matched ? "groups" : "hourglass_empty"}
                  className={`text-6xl text-white ${matched ? "" : "animate-spin"}`}
                  style={matched ? undefined : { animationDuration: "3s" }}
                />
              </div>
              <div className="absolute -right-4 -top-4 h-6 w-6 bg-red-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]" />
              <div className="absolute -bottom-2 -left-6 h-4 w-4 bg-orange-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]" />
            </div>

            <div className="mb-10 text-center">
              <h1 className="brick-sans mb-3 text-4xl font-black uppercase text-white drop-shadow-[5px_5px_0px_rgba(0,0,0,0.9)] md:text-5xl">
                Finding a Debate Buddy...
              </h1>
              <p className="font-body text-sm font-bold uppercase tracking-wide text-red-400 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                {isSupabaseConfigured()
                  ? "Matching with another player in the queue"
                  : "Scanning the crimson forests for worthy opponents"}
              </p>
              {matchError ? (
                <p className="mt-4 max-w-md text-center font-mono text-xs text-amber-400">
                  {matchError}
                </p>
              ) : null}
            </div>

            <div className="relative w-full max-w-md overflow-hidden border-2 border-stone-900 bg-stone-950 p-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
              <div className="flex h-8 items-center bg-black px-1">
                <div
                  className="relative h-6 bg-primary-container shadow-[inset_0_2px_0_0_rgba(255,255,255,0.4)] transition-[width] duration-300 ease-linear"
                  style={{ width: `${matched ? 100 : pct}%` }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/20" />
                </div>
              </div>
              <div className="mt-2 flex justify-between px-1">
                <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] font-bold uppercase tracking-widest text-primary-fixed">
                  {matched ? "Match found" : "Searching..."}
                </span>
                <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] font-bold uppercase tracking-widest text-primary-fixed">
                  {matched ? 100 : pct}%
                </span>
              </div>
            </div>

            {!matched ? (
              <div className="mt-10 flex flex-col items-center gap-4">
                {!isSupabaseConfigured() ? (
                  <button
                    type="button"
                    onClick={() => {
                      const topic = pickRandomMatchTopic();
                      router.push(
                        `/debate?topic=custom&title=${encodeURIComponent(topic)}&format=wsda`,
                      );
                    }}
                    className="bg-[#2d0d0d] px-6 py-3 text-xs font-black uppercase text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-75 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none brick-sans md:hidden"
                  >
                    Skip (demo)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const topic = pickRandomMatchTopic();
                      void cancelQueueAndGo(
                        `/debate?topic=custom&title=${encodeURIComponent(topic)}&format=wsda`,
                      );
                    }}
                    className="bg-[#2d0d0d] px-6 py-3 text-xs font-black uppercase text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-75 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none brick-sans md:hidden"
                  >
                    Practice solo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void cancelQueueAndGo("/onboarding")}
                  className="brick-sans border-t-2 border-l-2 border-red-900/50 bg-[#2d0d0d] px-10 py-4 font-black uppercase text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-75 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
                >
                  Cancel Queue
                </button>
              </div>
            ) : null}
          </section>
        </main>
      </NetherSidebarShell>

      {matched ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-found-title"
          aria-describedby="match-found-desc"
        >
          <div className="w-full max-w-md border-4 border-stone-800 bg-[#1a3d1a] p-6 shadow-[12px_12px_0_0_rgba(0,0,0,0.85)] md:p-8">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center border-2 border-[#58B13E] bg-[#0d260d]">
                <MaterialIcon name="groups" className="text-4xl text-[#58B13E]" />
              </div>
            </div>
            <h2
              id="match-found-title"
              className="brick-sans mb-4 text-center text-2xl font-black uppercase text-white md:text-3xl"
            >
              Match found
            </h2>
            <p
              id="match-found-desc"
              className="mb-2 text-center text-sm font-medium leading-relaxed text-stone-200 md:text-base"
            >
              Opponent locked in. Loading the WSDA debate room…
            </p>
            <p className="text-center text-xs uppercase tracking-widest text-[#58B13E]">
              Entering arena
            </p>
          </div>
        </div>
      ) : null}

      <footer className="fixed bottom-0 z-50 flex h-16 w-full items-center justify-around border-t-2 border-stone-800 bg-black shadow-[0_-4px_0_0_rgba(0,0,0,0.5)] md:hidden">
        <Link
          href="/onboarding"
          className="flex flex-col items-center justify-center text-white"
        >
          <MaterialIcon name="home" />
          <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] font-bold uppercase">
            Home
          </span>
        </Link>
        <Link
          href="/results"
          className="flex flex-col items-center justify-center text-stone-500"
        >
          <MaterialIcon name="history" />
          <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] font-bold uppercase">
            History
          </span>
        </Link>
        <button
          type="button"
          className="flex flex-col items-center justify-center text-stone-500"
        >
          <MaterialIcon name="equalizer" />
          <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] font-bold uppercase">
            Stats
          </span>
        </button>
      </footer>
    </div>
  );
}
