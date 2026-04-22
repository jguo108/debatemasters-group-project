"use client";

import { MaterialIcon } from "@/components/MaterialIcon";
import { downloadDebateTranscriptPdf } from "@/lib/pdf/transcript-pdf";
import type { DebateResult } from "@/lib/data/types";

const sans =
  "font-[family-name:var(--font-inter)] antialiased text-pretty" as const;

const topicTitleClass =
  "font-headline-pixel text-balance text-base font-black uppercase tracking-tight text-white drop-shadow-[3px_3px_0px_rgba(0,0,0,0.75)] !leading-[1.9] sm:text-lg sm:!leading-[2] md:text-xl md:!leading-[2.1]";

/** Main hero on result page — topic only (Press Start / Minecraft-style pixel font). */
function ResultTopicTitle({ topicTitle }: { topicTitle: string }) {
  return <h1 className={topicTitleClass}>{topicTitle}</h1>;
}

export function DebateResultDetail({ r }: { r: DebateResult }) {
  return (
    <div className={`relative z-20 mx-auto max-w-5xl p-8 md:p-12 ${sans}`}>
      <div className="mx-auto mb-12 max-w-4xl text-center">
        <ResultTopicTitle topicTitle={r.topicTitle} />
      </div>

      <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-12">
        <div className="relative group md:col-span-7">
          <div className="absolute -top-4 -left-4 h-full w-full bg-black" />
          <div className="relative border-4 border-secondary bg-stone-100 p-6 shadow-lg md:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-stone-300 pb-4">
              <MaterialIcon
                name="menu_book"
                className="scale-125 text-secondary"
                filled
              />
              <h2 className="text-lg font-bold uppercase tracking-wide text-secondary md:text-xl">
                Master&apos;s feedback
              </h2>
            </div>
            <div className="space-y-4 leading-relaxed text-stone-900">
              <p className="clearfix text-base font-normal first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-extrabold first-letter:text-5xl first-letter:leading-none first-letter:text-primary">
                {r.feedback}
              </p>
              <div className="border-l-4 border-primary bg-stone-200/90 p-4 text-sm italic leading-relaxed text-stone-800">
                &quot;{r.quote}&quot;
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="border-2 border-primary bg-primary-fixed-dim/90 p-4">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-800">
                    Clarity
                  </span>
                  <span className="text-3xl font-extrabold tabular-nums text-stone-900">
                    {r.scores.clarity}
                    <span className="ml-1 text-base font-bold text-stone-700">
                      /5
                    </span>
                  </span>
                </div>
                <div className="border-2 border-tertiary bg-tertiary-fixed-dim/90 p-4">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-800">
                    Evidence
                  </span>
                  <span className="text-3xl font-extrabold tabular-nums text-stone-900">
                    {r.scores.evidence}
                    <span className="ml-1 text-base font-bold text-stone-700">
                      /5
                    </span>
                  </span>
                </div>
              </div>
              <div className="mt-4 border-2 border-[#2d5a24] bg-[#1a2218] p-4">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#7bdc6a]">
                    Experience orbs
                  </span>
                  <span className="text-lg font-black tabular-nums text-[#58B13E]">
                    +{r.xpEarned} XP
                  </span>
                </div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Player level {r.level}
                </div>
                <div className="h-3 border-2 border-black bg-stone-950">
                  <div
                    className="h-full bg-[#58B13E] transition-[width] duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((r.xpCurrent / Math.max(1, r.xpToNext)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  {r.xpCurrent} / {r.xpToNext} toward next level
                </div>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-0 h-6 w-3/4 border-x-8 border-black bg-stone-800 shadow-[0_4px_0_#000]" />
          <div className="mx-auto mt-0 h-4 w-1/2 border-x-8 border-black bg-stone-900 shadow-[0_4px_0_#000]" />
        </div>

        <div className="space-y-6 md:col-span-5">
          <h3 className="flex items-center gap-2 text-base font-bold uppercase tracking-wide text-white md:text-lg">
            <MaterialIcon name="auto_stories" filled />
            Suggested tome study
          </h3>

          {r.suggestedTomes.map((tome, index) => (
            <a
              key={`${r.id}-tome-${index}`}
              href="#"
              className={`group relative block border-4 border-black p-5 transition-transform hover:-translate-y-1 pixel-shadow md:p-6 ${
                tome.accent === "tertiary" ? "bg-tertiary" : "bg-primary"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <div className="relative flex items-start gap-4">
                <div className="relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden border-4 border-white/60 bg-[#b24bf3] pixel-shadow">
                  <div className="absolute top-0 left-0 h-full w-full -rotate-45 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  <MaterialIcon name={tome.icon} className="text-3xl text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold uppercase leading-snug tracking-wide text-white md:text-base">
                    {tome.title}
                  </h4>
                  <p
                    className={`mt-1 text-xs font-semibold uppercase tracking-wide opacity-90 ${
                      tome.accent === "tertiary"
                        ? "text-tertiary-fixed"
                        : "text-primary-fixed"
                    }`}
                  >
                    {tome.subtitle}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  {tome.kind === "enchanted" ? "Enchanted" : "Rare"}
                </span>
                <span className="bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  {tome.label}
                </span>
              </div>
            </a>
          ))}

          <div className="border-4 border-stone-800 bg-black p-6 pixel-shadow">
            <h4 className="mb-4 border-b border-stone-700 pb-2 text-xs font-bold uppercase tracking-wide text-stone-100">
              Loot dropped
            </h4>
            <ul className="space-y-3">
              {r.loot.map((item, index) => (
                <li key={`${r.id}-loot-${index}`} className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 shrink-0 border-4 ${
                      item.tone === "gold"
                        ? "border-yellow-700 bg-yellow-400"
                        : "border-emerald-700 bg-emerald-400"
                    }`}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wide text-stone-300">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="mt-14 border-4 border-stone-800 bg-black/75 p-5 pixel-shadow md:p-6">
        <h3 className="mb-4 flex items-center gap-2 border-b border-stone-700 pb-2 text-sm font-bold uppercase tracking-wide text-stone-100 md:text-base">
          <MaterialIcon name="history_edu" />
          Full transcript
        </h3>
        <button
          type="button"
          onClick={() => downloadDebateTranscriptPdf(r)}
          disabled={r.transcript.length === 0}
          className="brick-sans inline-flex items-center gap-2 border-b-4 border-r-4 border-black bg-[#2D1B19] px-5 py-3 font-black uppercase tracking-widest text-[#58B13E] transition-all hover:bg-[#3a2824] hover:brightness-110 active:translate-y-1 active:border-0 disabled:pointer-events-none disabled:opacity-40"
        >
          <MaterialIcon name="download" className="text-lg text-[#58B13E]" />
          Download transcript (PDF)
        </button>
      </section>

    </div>
  );
}
