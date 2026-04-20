"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DebateSession } from "@/lib/data/types";
import {
  WSDA_PHASES,
  formatMmSs,
  userMaySpeak,
  wsdaActiveSpeakerLabel,
} from "@/lib/debate/wsda-schedule";

export type WsdaDebateContextValue = {
  session: DebateSession;
  phaseIndex: number;
  secondsLeft: number;
  phase: (typeof WSDA_PHASES)[number] | undefined;
  isComplete: boolean;
  activeSpeaker: "pro" | "con" | "both" | "none";
  userCanPost: boolean;
  phaseLabel: string;
  inputHint: string;
};

const WsdaDebateContext = createContext<WsdaDebateContextValue | null>(null);

export function useWsdaDebate(): WsdaDebateContextValue {
  const v = useContext(WsdaDebateContext);
  if (!v) {
    throw new Error("useWsdaDebate must be used within WsdaDebateProvider");
  }
  return v;
}

export function WsdaDebateProvider({
  session,
  children,
}: {
  session: DebateSession;
  children: ReactNode;
}) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(WSDA_PHASES[0].durationSec);

  const phase = WSDA_PHASES[phaseIndex];
  const isComplete =
    phaseIndex === WSDA_PHASES.length - 1 && secondsLeft <= 0;

  useEffect(() => {
    if (!phase || isComplete) {
      return;
    }

    const id = window.setTimeout(() => {
      if (secondsLeft > 0) {
        setSecondsLeft((s) => Math.max(0, s - 1));
        return;
      }

      const nextIndex = phaseIndex + 1;
      const nextPhase = WSDA_PHASES[nextIndex];
      if (!nextPhase) {
        return;
      }
      setPhaseIndex(nextIndex);
      setSecondsLeft(nextPhase.durationSec);
    }, 1000);

    return () => window.clearTimeout(id);
  }, [phase, phaseIndex, secondsLeft, isComplete]);

  const activeSpeaker = phase?.activeSpeaker ?? "none";
  const userCanPost = userMaySpeak(activeSpeaker, session.userRole);

  const phaseLabel = useMemo(() => {
    if (isComplete) {
      return "Debate complete — all WSDA phases finished. Thank both sides.";
    }
    if (!phase) {
      return "Round complete — thank both sides.";
    }
    const speaker = wsdaActiveSpeakerLabel(activeSpeaker);
    const turn =
      activeSpeaker === "none"
        ? "No typing or speaking — prep only."
        : activeSpeaker === "both"
          ? "Both sides may type and send text."
        : `Only ${speaker} may speak or type.`;
    return `${phase.label} — ${phase.purpose} (${formatMmSs(phase.durationSec)}) — ${turn}`;
  }, [phase, activeSpeaker, isComplete]);

  const inputHint = useMemo(() => {
    if (activeSpeaker === "none") {
      return "Mandatory prep — no typing.";
    }
    if (activeSpeaker === "both") {
      return "Cross-examination — both sides may type and send text.";
    }
    if (!userCanPost) {
      const side = activeSpeaker === "pro" ? "Pro" : "Con";
      return `Wait — ${side} is speaking. You may type when it is your side's turn.`;
    }
    return `Your turn (${session.userRole === "pro" ? "Pro" : "Con"}) — speak within the rules.`;
  }, [activeSpeaker, userCanPost, session.userRole]);

  const value = useMemo(
    (): WsdaDebateContextValue => ({
      session,
      phaseIndex,
      secondsLeft,
      phase,
      isComplete,
      activeSpeaker,
      userCanPost,
      phaseLabel,
      inputHint,
    }),
    [
      session,
      phaseIndex,
      secondsLeft,
      phase,
      isComplete,
      activeSpeaker,
      userCanPost,
      phaseLabel,
      inputHint,
    ],
  );

  return (
    <WsdaDebateContext.Provider value={value}>
      {children}
    </WsdaDebateContext.Provider>
  );
}
