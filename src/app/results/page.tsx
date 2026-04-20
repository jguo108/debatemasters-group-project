"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import {
  removeDebateResultFromHistory,
  useCombinedDebateHistory,
} from "@/lib/data/history-storage";

function formatDebateWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

export default function ResultsPage() {
  const history = useCombinedDebateHistory();
  const [visibleCount, setVisibleCount] = useState(4);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    topicTitle: string;
  } | null>(null);
  const visibleHistory = history.slice(0, visibleCount);
  const hasMore = visibleCount < history.length;

  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(prev, 4), history.length || 4));
  }, [history.length]);

  return (
    <div className="relative z-20 mx-auto max-w-3xl px-6 py-10 text-pretty md:px-12 md:py-14">
      <header className="mb-10 text-center md:mb-14">
        <h1 className="brick-sans text-3xl font-black uppercase leading-none tracking-tighter text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)] md:text-5xl">
          DEBATE <br />
          <span className="text-[#58B13E]">HISTORY</span>
        </h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-orange-400 md:text-base">
          Select a past match to view scores, feedback, and loot
        </p>
      </header>

      <ul className="space-y-4">
        {visibleHistory.map((d) => (
          <li key={d.id} className="w-full list-none">
            <div className="grid w-full grid-cols-[minmax(0,1fr)_3.5rem] items-stretch gap-2">
              <Link
                href={`/results/${encodeURIComponent(d.id)}`}
                className="group flex w-full min-w-0 flex-col gap-3 border-4 border-stone-800 bg-black/70 p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)] transition-transform hover:-translate-y-0.5 hover:border-stone-600 md:flex-row md:items-center md:justify-between md:gap-6 md:p-5"
              >
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    {formatDebateWhen(d.debatedAt)}
                  </p>
                  <h2 className="mt-1 text-base font-bold uppercase leading-snug tracking-wide text-white group-hover:text-primary-fixed md:text-lg">
                    {d.topicTitle}
                  </h2>
                  <p className="mt-1 truncate text-xs font-medium uppercase tracking-wide text-stone-400">
                    {d.headline} — {d.subline}
                  </p>
                </div>
                <div className="flex min-w-[9.5rem] shrink-0 items-center justify-end gap-4">
                  <span
                    className={`w-[5.75rem] border-2 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide ${
                      d.outcome === "victory"
                        ? "border-primary bg-primary/30 text-primary-fixed"
                        : d.outcome === "forfeit"
                          ? "border-red-500 bg-red-950 text-red-300"
                        : "border-stone-600 bg-stone-800 text-stone-300"
                    }`}
                  >
                    {d.outcome === "victory"
                      ? "Victory"
                      : d.outcome === "forfeit"
                        ? "Defeat"
                        : "Tie"}
                  </span>
                  <span className="text-primary-fixed md:hidden" aria-hidden>
                    <MaterialIcon name="chevron_right" />
                  </span>
                  <MaterialIcon
                    name="chevron_right"
                    className="hidden text-primary-fixed transition-transform group-hover:translate-x-0.5 md:block"
                  />
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setPendingDelete({ id: d.id, topicTitle: d.topicTitle });
                }}
                className="inline-flex w-14 items-center justify-center border-4 border-red-900 bg-red-950 px-3 text-red-300 shadow-[6px_6px_0_0_rgba(0,0,0,0.8)] transition-all hover:bg-red-900/90 hover:text-red-100 active:translate-y-0.5"
                aria-label={`Delete ${d.topicTitle} from history`}
                title="Delete debate history"
              >
                <MaterialIcon name="delete" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 4)}
            className="brick-sans border-b-4 border-r-4 border-orange-900 bg-orange-700 px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-orange-600 active:translate-y-1 active:border-0 md:px-8"
          >
            Load more
          </button>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md border-4 border-red-900 bg-[#1a0505] p-5 shadow-[10px_10px_0_0_rgba(0,0,0,0.85)] md:p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-red-900/80 pb-3">
              <MaterialIcon name="warning" className="text-orange-500" />
              <h2 className="brick-sans text-lg font-black uppercase tracking-wide text-white">
                Delete?
              </h2>
            </div>
            <p className="text-sm font-medium uppercase tracking-wide text-stone-300">
              Remove from history.
            </p>
            <p className="mt-3 border-2 border-stone-800 bg-black/60 p-3 text-xs font-semibold uppercase leading-relaxed tracking-wide text-orange-200">
              {pendingDelete.topicTitle}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="border-b-4 border-stone-700 bg-stone-800 px-4 py-2 text-xs font-black uppercase tracking-wide text-stone-200 transition-all hover:bg-stone-700 active:translate-y-0.5 active:border-b-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  removeDebateResultFromHistory(pendingDelete.id);
                  setPendingDelete(null);
                }}
                className="border-b-4 border-red-950 bg-red-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition-all hover:bg-red-600 active:translate-y-0.5 active:border-b-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-12 flex justify-center">
        <Link
          href="/onboarding"
          className="brick-sans inline-block border-b-4 border-r-4 border-[#3d8a2e] bg-[#58B13E] px-10 py-4 text-center font-black uppercase tracking-widest text-white transition-all hover:brightness-110 active:translate-y-1 active:border-0 md:px-14"
        >
          NEW DEBATE
        </Link>
      </div>
    </div>
  );
}
