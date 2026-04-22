"use client";

import Link from "next/link";
import { useState } from "react";
import { NetherSidebarShell } from "@/components/layout/NetherSidebarShell";
import { OnboardingSidebar } from "@/components/sidebars/OnboardingSidebar";
import { MaterialIcon } from "@/components/MaterialIcon";
import { getMockTopics } from "@/lib/data/repository";
import type { TopicCategory } from "@/lib/data/types";

function TopicIcon({ name, className }: { name: string; className?: string }) {
  return <MaterialIcon name={name} className={className} />;
}

function shadowFor(accent: TopicCategory["accent"]) {
  return accent === "tertiary"
    ? "shadow-[0px_4px_0px_0px_#00497d] hover:shadow-[0px_2px_0px_0px_#00497d]"
    : "shadow-[0px_4px_0px_0px_#085300] hover:shadow-[0px_2px_0px_0px_#085300]";
}

export default function TopicsPage() {
  const topics = getMockTopics();
  const [soloRole, setSoloRole] = useState<"pro" | "con">("pro");
  const [soloDurationMinutes, setSoloDurationMinutes] = useState<
    1 | 3 | 5 | 10 | 15
  >(5);
  const durationOptions: Array<1 | 3 | 5 | 10 | 15> = [1, 3, 5, 10, 15];

  return (
    <div className="bg-background font-[family-name:var(--font-inter)] text-on-background selection:bg-primary selection:text-white">
      <NetherSidebarShell sidebar={<OnboardingSidebar />}>
        <main className="nether-bg-topics relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#ba1a1a20_100%)]" />
          <div className="relative z-10 mx-auto max-w-7xl p-6 md:p-8">
            <Link
              href="/onboarding"
              className="brick-sans mb-8 inline-flex items-center gap-2 border-b-4 border-r-4 border-black bg-[#2D1B19] px-4 py-3 font-black uppercase tracking-widest text-[#58B13E] transition-all hover:bg-[#3a2824] hover:brightness-110 active:translate-y-1 active:border-0"
            >
              <MaterialIcon name="arrow_back" className="text-lg text-[#58B13E]" />
              BACK
            </Link>
            <section className="mb-8 border-l-8 border-primary-fixed bg-stone-900/70 p-5">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
                <div>
                  <p className="mb-3 font-headline-pixel text-[8px] font-bold uppercase tracking-widest text-stone-300">
                    Side
                  </p>
                  <div className="inline-flex border-4 border-black bg-stone-950 p-1">
                    <button
                      type="button"
                      onClick={() => setSoloRole("pro")}
                      className={`px-4 py-2 font-headline-pixel text-[10px] font-black uppercase transition-all ${
                        soloRole === "pro"
                          ? "bg-primary text-white shadow-[0px_3px_0px_0px_#085300]"
                          : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                      }`}
                    >
                      Pro
                    </button>
                    <button
                      type="button"
                      onClick={() => setSoloRole("con")}
                      className={`px-4 py-2 font-headline-pixel text-[10px] font-black uppercase transition-all ${
                        soloRole === "con"
                          ? "bg-tertiary text-white shadow-[0px_3px_0px_0px_#00497d]"
                          : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                      }`}
                    >
                      Con
                    </button>
                  </div>
                </div>
                <div>
                  <p className="mb-3 font-headline-pixel text-[8px] font-bold uppercase tracking-widest text-stone-300">
                    Time
                  </p>
                  <div className="inline-flex flex-wrap border-4 border-black bg-stone-950 p-1">
                    {durationOptions.map((minutes) => {
                      const selected = soloDurationMinutes === minutes;
                      return (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => setSoloDurationMinutes(minutes)}
                          className={`px-4 py-2 font-headline-pixel text-[10px] font-black uppercase transition-all ${
                            selected
                              ? "bg-primary text-white shadow-[0px_3px_0px_0px_#085300]"
                              : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                          }`}
                        >
                          {minutes} mins
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
            <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {topics.map((t) => {
                const inner = (
                  <>
                    <div
                      className={`absolute top-0 right-0 flex h-16 w-16 items-center justify-center ${
                        t.accent === "tertiary"
                          ? "bg-tertiary-container/20"
                          : t.id === "superheroes" || t.id === "animals"
                            ? "bg-primary-container/20"
                            : "bg-secondary-container/20"
                      }`}
                    >
                      <TopicIcon
                        name={t.icon}
                        className={`text-4xl ${
                          t.id === "climate"
                            ? "text-primary"
                            : t.accent === "tertiary"
                              ? "text-tertiary"
                              : t.id === "animals"
                                ? "text-secondary"
                                : "text-primary-fixed"
                        }`}
                      />
                    </div>
                    <div>
                      <div
                        className={`${t.accent === "tertiary" ? "bg-tertiary" : "bg-primary"} mb-4 inline-block px-3 py-1`}
                      >
                        <span className="font-headline-pixel text-[8px] font-black uppercase tracking-tighter text-white">
                          {t.badge}
                        </span>
                      </div>
                      <h3
                        className={`font-headline-pixel font-black uppercase leading-tight text-on-surface ${
                          t.wide ? "mb-2 text-3xl" : "mb-2 text-xl"
                        }`}
                      >
                        {t.title}
                      </h3>
                      <p
                        className={`font-headline-pixel font-bold leading-relaxed text-on-surface-variant ${
                          t.wide ? "max-w-sm text-[12px]" : "text-[10px]"
                        }`}
                      >
                        {t.description}
                      </p>
                    </div>
                  </>
                );

                const btn =
                  t.accent === "tertiary" ? (
                    <Link
                      href={`/debate?topic=${encodeURIComponent(t.id)}&role=${soloRole}&duration=${soloDurationMinutes}`}
                      className={`relative flex items-center justify-center gap-2 bg-tertiary py-3 px-6 font-headline-pixel font-black text-white transition-all hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none ${shadowFor("tertiary")} text-[10px]`}
                    >
                      GO <TopicIcon name="play_arrow" className="text-sm" />
                    </Link>
                  ) : (
                    <Link
                      href={`/debate?topic=${encodeURIComponent(t.id)}&role=${soloRole}&duration=${soloDurationMinutes}`}
                      className={`relative flex items-center justify-center gap-2 bg-primary py-3 px-6 font-headline-pixel font-black text-white transition-all hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none ${shadowFor("primary")} ${
                        t.wide ? "py-4 px-12 text-sm" : "text-[10px]"
                      }`}
                    >
                      GO{" "}
                      {t.wide ? (
                        <TopicIcon name="rocket_launch" />
                      ) : (
                        <TopicIcon name="play_arrow" className="text-sm" />
                      )}
                    </Link>
                  );

                if (t.wide) {
                  return (
                    <div
                      key={t.id}
                      className="group relative flex h-80 flex-col justify-between overflow-hidden border-b-8 border-r-8 border-stone-950 bg-surface-container-low p-6 voxel-glow transition-all hover:-translate-y-1 active:translate-y-1 md:col-span-2"
                    >
                      {t.backgroundImageUrl ? (
                        <div className="absolute inset-0 z-0 opacity-10">
                          <img
                            alt=""
                            className="h-full w-full object-cover grayscale"
                            src={t.backgroundImageUrl}
                          />
                        </div>
                      ) : null}
                      <div className="relative z-10">{inner}</div>
                      <div className="relative z-10 flex justify-end">{btn}</div>
                    </div>
                  );
                }

                return (
                  <div
                    key={t.id}
                    className="group relative flex h-80 flex-col justify-between border-b-8 border-r-8 border-stone-950 bg-surface-container-low p-6 voxel-glow transition-all hover:-translate-y-1 active:translate-y-1"
                  >
                    {inner}
                    <div>{btn}</div>
                  </div>
                );
              })}

              <div className="voxel-glow relative flex flex-col gap-6 overflow-hidden border-4 border-primary bg-stone-900 p-8 md:col-span-2">
                <div className="absolute -bottom-4 -right-4 flex h-32 w-32 rotate-12 items-center justify-center bg-primary/20">
                  <MaterialIcon
                    name="edit_note"
                    className="text-8xl text-primary/40"
                    filled
                  />
                </div>
                <div className="relative z-10">
                  <h2 className="mb-2 font-headline-pixel text-2xl font-black uppercase italic text-white">
                    EXCAVATE YOUR OWN
                  </h2>
                  <p className="font-headline-pixel text-[10px] font-bold leading-relaxed text-stone-400">
                    Don&apos;t see a biome you like? Design your own debate topic
                    from scratch.
                  </p>
                </div>
                <form
                  action="/debate"
                  method="get"
                  className="relative z-10 flex flex-col gap-4 md:flex-row"
                >
                  <input type="hidden" name="topic" value="custom" />
                  <input type="hidden" name="role" value={soloRole} />
                  <input
                    type="hidden"
                    name="duration"
                    value={soloDurationMinutes}
                  />
                  <div className="group flex-1">
                    <input
                      name="title"
                      required
                      className="font-headline-pixel w-full border-none bg-stone-800 p-4 font-bold text-[10px] text-white placeholder:text-stone-600 shadow-[inset_4px_4px_0px_0px_#000] focus:ring-4 focus:ring-tertiary"
                      placeholder="ENTER TOPIC NAME..."
                      type="text"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-primary px-12 py-4 text-center font-headline-pixel text-sm font-black uppercase text-white shadow-[4px_4px_0px_0px_#085300] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:scale-95"
                  >
                    GO
                  </button>
                </form>
              </div>
            </div>

          </div>
          <div className="pointer-events-none absolute bottom-10 right-10 h-24 w-24 rounded-full bg-red-600/30 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 left-1/4 h-16 w-16 rounded-full bg-orange-600/20 blur-2xl" />
        </main>
      </NetherSidebarShell>
    </div>
  );
}
