"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { OpponentExitNoticeModal } from "@/components/debate/OpponentExitNoticeModal";
import type { DebateSession } from "@/lib/data/types";
import {
  appendDebateResultToHistory,
  createOpponentVictoryByForfeitResult,
} from "@/lib/data/history-storage";
import { finalizeDebateWithAi } from "@/lib/data/debate-finalize";
import { wsdaStateFromElapsedSeconds } from "@/lib/debate/wsda-elapsed";
import {
  WSDA_PHASES,
  formatMmSs,
  userMaySpeak,
  wsdaActiveSpeakerLabel,
} from "@/lib/debate/wsda-schedule";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";

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

type ClockSnapshot = {
  phaseIndex: number;
  secondsLeft: number;
  isComplete: boolean;
};

function useWsdaClock(session: DebateSession): ClockSnapshot {
  const arenaRoomId = session.arenaRoomId;
  const useArenaPath = Boolean(arenaRoomId && isSupabaseConfigured());

  const [localPhaseIndex, setLocalPhaseIndex] = useState(0);
  const [localSecondsLeft, setLocalSecondsLeft] = useState(
    WSDA_PHASES[0]?.durationSec ?? 0,
  );

  const [serverClock, setServerClock] = useState<{
    startedAtMs: number;
    offsetMs: number;
  } | null>(null);
  const [arenaFallback, setArenaFallback] = useState(false);
  const [tick, setTick] = useState(0);

  const runLocalTimer = !useArenaPath || arenaFallback;

  useEffect(() => {
    if (!useArenaPath || arenaFallback) return;

    let cancelled = false;
    const supabase = createClient();

    function applyClock(startedAtMs: number, serverNowEpochSec: number) {
      setServerClock({
        startedAtMs,
        offsetMs: serverNowEpochSec * 1000 - Date.now(),
      });
    }

    async function begin() {
      const { data, error } = await supabase.rpc("arena_begin_wsda_session", {
        p_room: arenaRoomId,
      });
      if (cancelled) return;
      if (error || !data || (data as { status?: string }).status !== "ok") {
        console.error("arena_begin_wsda_session", error ?? data);
        setArenaFallback(true);
        return;
      }
      const d = data as {
        wsda_started_epoch: string | number;
        server_now_epoch: string | number;
      };
      applyClock(
        Number(d.wsda_started_epoch) * 1000,
        Number(d.server_now_epoch),
      );
    }

    void begin();

    const channel = supabase
      .channel(`debate_room_clock:${arenaRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "debate_rooms",
          filter: `id=eq.${arenaRoomId}`,
        },
        (payload) => {
          const raw = (payload.new as { wsda_started_at?: string | null })
            ?.wsda_started_at;
          if (!raw) return;
          const startedAtMs = Date.parse(raw);
          if (Number.isNaN(startedAtMs)) return;
          void supabase.rpc("arena_server_time").then(({ data: t, error: err }) => {
            if (cancelled || err || !t) return;
            const epoch = (t as { server_now_epoch?: number }).server_now_epoch;
            if (epoch === undefined) return;
            applyClock(startedAtMs, Number(epoch));
          });
        },
      )
      .subscribe();

    const syncId = window.setInterval(() => {
      void supabase.rpc("arena_server_time").then(({ data: t, error: err }) => {
        if (cancelled || err || !t) return;
        const epoch = (t as { server_now_epoch?: number }).server_now_epoch;
        if (epoch === undefined) return;
        setServerClock((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            offsetMs: Number(epoch) * 1000 - Date.now(),
          };
        });
      });
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(syncId);
      void supabase.removeChannel(channel);
    };
  }, [arenaRoomId, arenaFallback, useArenaPath]);

  useEffect(() => {
    if (!useArenaPath || arenaFallback || !serverClock) return;
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, [useArenaPath, arenaFallback, serverClock]);

  const phase = WSDA_PHASES[localPhaseIndex];

  useEffect(() => {
    if (!runLocalTimer) return;
    if (!phase) return;
    const isCompleteLocal =
      localPhaseIndex === WSDA_PHASES.length - 1 && localSecondsLeft <= 0;
    if (isCompleteLocal) return;

    const id = window.setTimeout(() => {
      if (localSecondsLeft > 0) {
        setLocalSecondsLeft((s) => Math.max(0, s - 1));
        return;
      }

      const nextIndex = localPhaseIndex + 1;
      const nextPhase = WSDA_PHASES[nextIndex];
      if (!nextPhase) {
        return;
      }
      setLocalPhaseIndex(nextIndex);
      setLocalSecondsLeft(nextPhase.durationSec);
    }, 1000);

    return () => window.clearTimeout(id);
  }, [
    runLocalTimer,
    phase,
    localPhaseIndex,
    localSecondsLeft,
    phase?.durationSec,
  ]);

  const arenaSnapshot = useMemo((): ClockSnapshot | null => {
    if (runLocalTimer || !serverClock) return null;
    const elapsedMs =
      Date.now() + serverClock.offsetMs - serverClock.startedAtMs;
    return wsdaStateFromElapsedSeconds(elapsedMs / 1000);
  }, [runLocalTimer, serverClock, tick]);

  return useMemo((): ClockSnapshot => {
    if (arenaSnapshot) {
      return arenaSnapshot;
    }
    return {
      phaseIndex: localPhaseIndex,
      secondsLeft: localSecondsLeft,
      isComplete:
        localPhaseIndex === WSDA_PHASES.length - 1 && localSecondsLeft <= 0,
    };
  }, [
    arenaSnapshot,
    localPhaseIndex,
    localSecondsLeft,
  ]);
}

export function WsdaDebateProvider({
  session,
  children,
}: {
  session: DebateSession;
  children: ReactNode;
}) {
  const router = useRouter();
  const [opponentWinResultId, setOpponentWinResultId] = useState<string | null>(
    null,
  );
  const [aiResultId, setAiResultId] = useState<string | null>(null);
  const opponentForfeitHandledRef = useRef(false);
  const aiFinalizeStartedRef = useRef(false);

  useEffect(() => {
    const roomId = session.arenaRoomId;
    if (!roomId || !isSupabaseConfigured()) return;

    const supabase = createClient();
    let cancelled = false;
    let claimLock = false;

    function applyOpponentWin(forfeitedBy: string | null | undefined) {
      if (!forfeitedBy || opponentForfeitHandledRef.current) return;
      if (claimLock) return;
      claimLock = true;
      void (async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (cancelled || !user) return;
          if (forfeitedBy === user.id) return;
          if (opponentForfeitHandledRef.current) return;
          opponentForfeitHandledRef.current = true;
          const result = createOpponentVictoryByForfeitResult({
            sessionId: session.id,
            topicTitle: session.topicTitle,
            opponentName: session.opponentName,
            userRole: session.userRole,
            debateFormat: session.debateFormat,
            arenaRoomId: roomId,
            selfUserId: user.id,
          });
          await appendDebateResultToHistory(result);
          setOpponentWinResultId(result.id);
        } finally {
          claimLock = false;
        }
      })();
    }

    void (async () => {
      const { data, error } = await supabase
        .from("debate_rooms")
        .select("forfeited_by_user_id")
        .eq("id", roomId)
        .maybeSingle();
      if (cancelled || error) return;
      applyOpponentWin(data?.forfeited_by_user_id ?? null);
    })();

    const channel = supabase
      .channel(`debate_room_forfeit_listener:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "debate_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const fid = (payload.new as { forfeited_by_user_id?: string | null })
            ?.forfeited_by_user_id;
          applyOpponentWin(fid);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [
    session.arenaRoomId,
    session.debateFormat,
    session.id,
    session.opponentName,
    session.topicTitle,
    session.userRole,
  ]);

  const { phaseIndex, secondsLeft, isComplete } = useWsdaClock(session);

  useEffect(() => {
    if (!isComplete) return;
    if (opponentForfeitHandledRef.current) return;
    if (aiFinalizeStartedRef.current) return;
    if (aiResultId) return;
    aiFinalizeStartedRef.current = true;
    void (async () => {
      const judged = await finalizeDebateWithAi({
        sessionId: session.id,
        topicTitle: session.topicTitle,
        opponentName: session.opponentName,
        userRole: session.userRole,
        debateFormat: session.debateFormat,
        arenaRoomId: session.arenaRoomId,
      });
      if (judged.ok) {
        setAiResultId(judged.resultId);
        return;
      }
      aiFinalizeStartedRef.current = false;
      console.warn("WSDA AI finalize failed:", judged.error);
    })();
  }, [
    aiResultId,
    isComplete,
    session.arenaRoomId,
    session.debateFormat,
    session.id,
    session.opponentName,
    session.topicTitle,
    session.userRole,
  ]);

  useEffect(() => {
    if (!aiResultId) return;
    router.push(`/results/${encodeURIComponent(aiResultId)}`);
  }, [aiResultId, router]);

  const phase = WSDA_PHASES[phaseIndex];

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
      <OpponentExitNoticeModal
        open={opponentWinResultId !== null}
        opponentName={session.opponentName}
        modalRootId="debate-chat-area"
        onOk={() => {
          if (opponentWinResultId) {
            router.push(`/results/${encodeURIComponent(opponentWinResultId)}`);
          }
          setOpponentWinResultId(null);
        }}
      />
      {children}
    </WsdaDebateContext.Provider>
  );
}
