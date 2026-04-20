"use client";

import { useEffect, useState } from "react";

const SOLO_TOTAL_SECONDS = 15 * 60;

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function DebateRoomTimer({
  isSoloAi,
  staticMmSs,
  phaseCountdownSeconds,
  controlledSeconds,
  compact,
}: {
  isSoloAi: boolean;
  staticMmSs: string;
  /** WSDA (and similar): countdown for the active speech segment. */
  phaseCountdownSeconds?: number;
  /** Parent-driven countdown (e.g. WSDA phase engine). */
  controlledSeconds?: number;
  /** Tighter padding for header / inline use. */
  compact?: boolean;
}) {
  const [secondsLeft, setSecondsLeft] = useState(SOLO_TOTAL_SECONDS);
  const [phaseLeft, setPhaseLeft] = useState(
    () => phaseCountdownSeconds ?? 0,
  );

  useEffect(() => {
    if (phaseCountdownSeconds === undefined) return;
    setPhaseLeft(phaseCountdownSeconds);
  }, [phaseCountdownSeconds]);

  useEffect(() => {
    if (!isSoloAi) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isSoloAi]);

  useEffect(() => {
    if (phaseCountdownSeconds === undefined || controlledSeconds !== undefined)
      return;
    const id = window.setInterval(() => {
      setPhaseLeft((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phaseCountdownSeconds, controlledSeconds]);

  const display =
    controlledSeconds !== undefined
      ? formatMmSs(controlledSeconds)
      : phaseCountdownSeconds !== undefined
        ? formatMmSs(phaseLeft)
        : isSoloAi
          ? formatMmSs(secondsLeft)
          : staticMmSs;

  return (
    <div
      className={
        compact
          ? "border-4 border-orange-600 bg-black px-4 py-1.5 text-orange-500 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.75)] glow-red pixel-text-lg font-black md:px-5 md:py-2"
          : "border-4 border-orange-600 bg-black px-6 py-4 text-orange-500 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] glow-red pixel-text-xl font-black md:px-10 md:py-6"
      }
      aria-live="polite"
      aria-label={
        controlledSeconds !== undefined
          ? "Phase time remaining"
          : phaseCountdownSeconds !== undefined
            ? "Phase time remaining"
            : isSoloAi
              ? "Debate time remaining"
              : "Phase timer"
      }
    >
      {display}
    </div>
  );
}
