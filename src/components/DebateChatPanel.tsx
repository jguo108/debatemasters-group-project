"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { writeActiveDebateTranscript } from "@/lib/data/history-storage";
import { pickConSimLine } from "@/lib/debate/con-sim-lines";
import {
  proConstructiveOpening,
  wsdaRoundChatCopy,
  wsdaRoundTransitionMessage,
} from "@/lib/debate/wsda-schedule";
import {
  pickMinecraftAvatarBySeed,
  useUserProfile,
} from "@/lib/data/profile-storage";
import type { DebateTranscriptEntry } from "@/lib/data/types";
import {
  useArenaRoomMessages,
  type ArenaRoomMessageRow,
} from "@/lib/debate/use-arena-room-messages";
import { isSupabaseConfigured } from "@/lib/supabase/browser-client";

type WsdaChatRow =
  | { kind: "system"; key: string; at: string; text: string }
  | { kind: "arena"; msg: ArenaRoomMessageRow }
  | { kind: "local"; id: number; text: string; postedAt: string }
  | { kind: "opening"; entry: DebateTranscriptEntry };

type SoloChatRow = {
  id: number;
  speaker: "you" | "opponent";
  text: string;
  replySource?: "deepseek" | "fallback";
};

type DebateChatPanelProps = {
  sessionId: string;
  opponentName: string;
  phaseLabel: string;
  debateFormat?: "wsda";
  topicTitle?: string;
  userRole?: "pro" | "con";
  /** WSDA: current segment index (0-based). */
  phaseIndex?: number;
  /** WSDA: whether the user may post in this segment. */
  userCanPost?: boolean;
  /** Shown when input is disabled (turn / prep). */
  inputDisabledHint?: string;
  /** WSDA: seconds left for current session. */
  secondsLeft?: number;
  /** WSDA: debate finished. */
  roundComplete?: boolean;
  /** When user is Pro and Con is speaking: simulate Con messages in chat. */
  simulateConOpponent?: boolean;
  /** Live arena: sync typed messages to Supabase for the other player. */
  arenaRoomId?: string;
  /** Live arena: from Supabase `profiles` (overrides local profile + seeded opponent head). */
  selfAvatarUrl?: string;
  opponentAvatarUrl?: string;
};

export function DebateChatPanel({
  sessionId,
  opponentName,
  phaseLabel,
  debateFormat,
  topicTitle,
  userRole,
  phaseIndex = 0,
  userCanPost = true,
  inputDisabledHint,
  secondsLeft = 0,
  roundComplete = false,
  simulateConOpponent = false,
  arenaRoomId,
  selfAvatarUrl: selfAvatarUrlOverride,
  opponentAvatarUrl: opponentAvatarUrlOverride,
}: DebateChatPanelProps) {
  const user = useUserProfile();
  const {
    messages: arenaMessages,
    currentUserId: arenaUserId,
    send: arenaSend,
  } = useArenaRoomMessages(
    arenaRoomId && isSupabaseConfigured() ? arenaRoomId : undefined,
  );
  const arenaTranscriptRef = useRef<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [soloChatRows, setSoloChatRows] = useState<SoloChatRow[]>([]);
  const [soloAwaitingReply, setSoloAwaitingReply] = useState(false);
  const [soloTimeExpired, setSoloTimeExpired] = useState(false);
  const [soloUsedFallback, setSoloUsedFallback] = useState(false);
  const [soloFallbackReason, setSoloFallbackReason] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<
    { id: number; text: string; postedAt: string }[]
  >([]);
  /** System lines must live in React state so the chat re-renders (ref-only transcript did not). */
  const [wsdaSystemFeed, setWsdaSystemFeed] = useState<DebateTranscriptEntry[]>([]);
  const [simConPosts, setSimConPosts] = useState<
    { id: number; text: string; phaseIndex: number }[]
  >([]);
  const transcriptRef = useRef<DebateTranscriptEntry[]>([]);
  const soloReplyAbortRef = useRef<AbortController | null>(null);
  const soloTimeExpiredRef = useRef(false);
  const postIdRef = useRef(0);
  const soloRowIdRef = useRef(0);
  const simPostIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedTranscriptRef = useRef(false);
  const prevWsdaPhaseRef = useRef<number | null>(null);
  const transitionEmittedRef = useRef<Set<string>>(new Set());
  const debateEndAnnouncedRef = useRef(false);

  const isWsda =
    debateFormat === "wsda" &&
    Boolean(topicTitle?.trim()) &&
    (userRole === "pro" || userRole === "con");

  const proSpeech = topicTitle?.trim()
    ? proConstructiveOpening(topicTitle.trim())
    : "";
  const youDisplayName = user.displayName || "Master Builder";
  const yourAvatarUrl = selfAvatarUrlOverride ?? user.avatarUrl;
  const opponentAvatarUrl = useMemo(
    () =>
      opponentAvatarUrlOverride ??
      pickMinecraftAvatarBySeed(opponentName || "opponent"),
    [opponentAvatarUrlOverride, opponentName],
  );

  const setTranscriptEntries = useCallback(
    (entries: DebateTranscriptEntry[]) => {
      transcriptRef.current = entries;
      writeActiveDebateTranscript(sessionId, entries);
    },
    [sessionId],
  );

  const appendTranscriptEntry = useCallback(
    (entry: DebateTranscriptEntry) => {
      const next = [...transcriptRef.current, entry];
      setTranscriptEntries(next);
      if (debateFormat === "wsda" && entry.speaker === "System") {
        setWsdaSystemFeed((prev) => [...prev, entry]);
      }
    },
    [debateFormat, setTranscriptEntries],
  );

  const requestSoloOpponentReply = useCallback(
    async (
      transcript: DebateTranscriptEntry[],
      signal?: AbortSignal,
    ): Promise<
      | { aborted: true; reply: null; usedFallback: false; reason: null }
      | { aborted: false; reply: string; usedFallback: boolean; reason: string | null }
    > => {
      const fallbacks = [
        "Your claim assumes intent matters more than outcomes, but policy is judged by impact first.",
        "You frame risk well, yet you still need a practical mechanism that scales beyond ideal cases.",
        "I disagree: your standard values caution, but it underestimates the cost of delaying progress.",
        "That argument is principled, but it dodges the tradeoff between fairness, speed, and access.",
      ];
      const lastUserLine =
        [...transcript].reverse().find((entry) => entry.speaker.includes("(You)"))?.text?.slice(
          0,
          120,
        ) ?? "";
      const fallback = `${fallbacks[Math.floor(Math.random() * fallbacks.length)]}${
        lastUserLine ? ` You said: "${lastUserLine}".` : ""
      }`;
      try {
        const res = await fetch("/api/ai/opponent-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            topicTitle: topicTitle?.trim() || phaseLabel,
            opponentName,
            userRole,
            transcript,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          reply?: string;
          error?: string;
        };
        if (!res.ok || !data.ok || typeof data.reply !== "string" || !data.reply.trim()) {
          console.warn("opponent-reply failed:", data.error ?? "unknown error");
          return {
            aborted: false as const,
            reply: fallback,
            usedFallback: true,
            reason: data.error ?? "Model response invalid.",
          };
        }
        return {
          aborted: false as const,
          reply: data.reply.trim(),
          usedFallback: false,
          reason: null,
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return {
            aborted: true as const,
            reply: null,
            usedFallback: false,
            reason: null,
          };
        }
        console.warn("opponent-reply request threw:", error);
        return {
          aborted: false as const,
          reply: fallback,
          usedFallback: true,
          reason: error instanceof Error ? error.message : "Network failure.",
        };
      }
    },
    [opponentName, phaseLabel, topicTitle, userRole],
  );

  useEffect(() => {
    if (initializedTranscriptRef.current) return;
    initializedTranscriptRef.current = true;
    const now = new Date().toISOString();

    if (isWsda) {
      const t0 = Date.now();
      const at = (i: number) => new Date(t0 + i).toISOString();
      const initial: DebateTranscriptEntry[] = [
        {
          speaker: "System",
          text: `Debate opened: ${topicTitle?.trim() || "WSDA round"}`,
          at: at(0),
        },
      ];
      const copy = wsdaRoundChatCopy(phaseIndex);
      if (copy) {
        initial.push({
          speaker: "System",
          text: `Session ${copy.roundNumber}/${copy.totalRounds}: ${copy.headline}. ${copy.purpose} ${copy.instruction}`,
          at: at(1),
        });
      }
      if (phaseIndex === 0 && proSpeech && !arenaRoomId) {
        const openingSpeaker =
          userRole === "pro" ? "You (Pro)" : `${opponentName} (Pro)`;
        const opening: DebateTranscriptEntry = {
          speaker: openingSpeaker,
          text: proSpeech,
          at: at(2),
        };
        initial.push(opening);
      }
      setTranscriptEntries(initial);
      setWsdaSystemFeed(initial.filter((e) => e.speaker === "System"));
      return;
    }

    const initialTranscript: DebateTranscriptEntry[] = [
      {
        speaker: "System",
        text: `Debate opened: ${topicTitle?.trim() || phaseLabel}`,
        at: now,
      },
    ];
    setTranscriptEntries(initialTranscript);
    soloRowIdRef.current = 0;
    setSoloChatRows([]);
    setSoloTimeExpired(false);
    soloTimeExpiredRef.current = false;
  }, [
    appendTranscriptEntry,
    isWsda,
    arenaRoomId,
    opponentName,
    phaseIndex,
    phaseLabel,
    proSpeech,
    setTranscriptEntries,
    topicTitle,
    youDisplayName,
    userRole,
  ]);

  useEffect(() => {
    if (isWsda) return;
    const onTimeUp = (event: Event) => {
      const custom = event as CustomEvent<{ sessionId?: string }>;
      if (custom.detail?.sessionId !== sessionId) return;
      soloTimeExpiredRef.current = true;
      setSoloTimeExpired(true);
      soloReplyAbortRef.current?.abort();
      soloReplyAbortRef.current = null;
      setSoloAwaitingReply(false);
    };
    window.addEventListener("solo-debate-time-up", onTimeUp as EventListener);
    return () => {
      window.removeEventListener("solo-debate-time-up", onTimeUp as EventListener);
    };
  }, [isWsda, sessionId]);

  useEffect(() => {
    if (!isWsda) return;
    const prev = prevWsdaPhaseRef.current;
    prevWsdaPhaseRef.current = phaseIndex;
    if (prev === null) {
      return;
    }
    if (phaseIndex <= prev) {
      return;
    }
    const key = `${prev}->${phaseIndex}`;
    if (transitionEmittedRef.current.has(key)) {
      return;
    }
    const text = wsdaRoundTransitionMessage(prev);
    if (!text) {
      return;
    }
    transitionEmittedRef.current.add(key);
    appendTranscriptEntry({
      speaker: "System",
      text,
      at: new Date().toISOString(),
    });
  }, [appendTranscriptEntry, isWsda, phaseIndex]);

  useEffect(() => {
    if (!roundComplete || !isWsda || debateEndAnnouncedRef.current) {
      return;
    }
    debateEndAnnouncedRef.current = true;
    appendTranscriptEntry({
      speaker: "System",
      text: "Debate complete. All WSDA sessions finished.",
      at: new Date().toISOString(),
    });
  }, [appendTranscriptEntry, isWsda, roundComplete]);

  useEffect(() => {
    if (!isWsda || !simulateConOpponent) {
      return;
    }
    const add = () => {
      simPostIdRef.current += 1;
      const id = simPostIdRef.current;
      const text = pickConSimLine(phaseIndex);
      setSimConPosts((prev) => [...prev, { id, text, phaseIndex }]);
      appendTranscriptEntry({
        speaker: `${opponentName} (Con)`,
        text,
        at: new Date().toISOString(),
      });
    };
    const first = window.setTimeout(add, 3500);
    const interval = window.setInterval(
      add,
      10000 + Math.floor(Math.random() * 5000),
    );
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [appendTranscriptEntry, isWsda, opponentName, simulateConOpponent, phaseIndex]);

  const visibleSimConPosts = simConPosts.filter(
    (post) => post.phaseIndex === phaseIndex,
  );

  const wsdaArenaTimeline = useMemo((): WsdaChatRow[] => {
    if (!isWsda || !arenaRoomId) return [];
    const rows: WsdaChatRow[] = [];
    let sk = 0;
    for (const e of wsdaSystemFeed) {
      if (e.speaker !== "System") continue;
      rows.push({
        kind: "system",
        key: `sys-${sk++}-${e.at}-${e.text.slice(0, 32)}`,
        at: e.at,
        text: e.text,
      });
    }
    for (const m of arenaMessages) {
      rows.push({ kind: "arena", msg: m });
    }
    const rowTime = (r: WsdaChatRow) => {
      if (r.kind === "system") return +new Date(r.at);
      if (r.kind === "arena") return +new Date(r.msg.created_at);
      return 0;
    };
    rows.sort((a, b) => {
      const ta = rowTime(a);
      const tb = rowTime(b);
      if (ta !== tb) return ta - tb;
      return a.kind === "system" ? -1 : 1;
    });
    return rows;
  }, [isWsda, arenaRoomId, wsdaSystemFeed, arenaMessages]);

  const wsdaLocalTimeline = useMemo((): WsdaChatRow[] => {
    if (!isWsda || arenaRoomId) return [];
    const rows: WsdaChatRow[] = [];
    let sk = 0;
    for (const e of wsdaSystemFeed) {
      if (e.speaker !== "System") continue;
      rows.push({
        kind: "system",
        key: `sys-${sk++}-${e.at}-${e.text.slice(0, 32)}`,
        at: e.at,
        text: e.text,
      });
    }
    for (const p of userPosts) {
      rows.push({
        kind: "local",
        id: p.id,
        text: p.text,
        postedAt: p.postedAt,
      });
    }
    rows.sort((a, b) => {
      const time = (r: WsdaChatRow) => {
        switch (r.kind) {
          case "system":
            return +new Date(r.at);
          case "opening":
            return +new Date(r.entry.at);
          case "local":
            return +new Date(r.postedAt);
          default:
            return 0;
        }
      };
      const ta = time(a);
      const tb = time(b);
      if (ta !== tb) return ta - tb;
      if (a.kind === "local" && b.kind === "local") return a.id - b.id;
      if (a.kind === b.kind) return 0;
      if (a.kind === "system" || a.kind === "opening") return -1;
      return 1;
    });
    return rows;
  }, [isWsda, arenaRoomId, wsdaSystemFeed, userPosts]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [
    userPosts.length,
    soloChatRows.length,
    soloAwaitingReply,
    arenaMessages.length,
    visibleSimConPosts.length,
    phaseIndex,
    isWsda,
    roundComplete,
    wsdaArenaTimeline.length,
    wsdaLocalTimeline.length,
  ]);

  const youRoleTag = userRole === "pro" ? "Pro" : "Con";
  const opponentRoleTag = userRole === "pro" ? "Con" : "Pro";
  const inputLocked =
    roundComplete ||
    !userCanPost ||
    (!isWsda && (soloAwaitingReply || soloTimeExpired));

  useEffect(() => {
    arenaTranscriptRef.current.clear();
  }, [arenaRoomId]);

  useEffect(() => {
    if (!arenaRoomId || !isWsda) return;
    for (const m of arenaMessages) {
      if (arenaTranscriptRef.current.has(m.id)) continue;
      arenaTranscriptRef.current.add(m.id);
      const isSelf = arenaUserId != null && m.user_id === arenaUserId;
      appendTranscriptEntry({
        speaker: isSelf
          ? `You (${youRoleTag})`
          : `${opponentName} (${opponentRoleTag})`,
        text: m.body,
        at: m.created_at,
      });
    }
  }, [
    arenaMessages,
    arenaRoomId,
    arenaUserId,
    isWsda,
    opponentName,
    opponentRoleTag,
    youRoleTag,
    appendTranscriptEntry,
  ]);

  function postMessage() {
    if (inputLocked) return;
    const text = draft.trim();
    if (!text) return;

    if (arenaRoomId && isSupabaseConfigured()) {
      void (async () => {
        const result = await arenaSend(text);
        if (result.error === null) {
          setDraft("");
        }
      })();
      return;
    }

    const postedAt = new Date().toISOString();
    if (isWsda) {
      postIdRef.current += 1;
      setUserPosts((prev) => [
        ...prev,
        { id: postIdRef.current, text, postedAt },
      ]);
    } else {
      soloRowIdRef.current += 1;
      const rowId = soloRowIdRef.current;
      setSoloChatRows((prev) => [...prev, { id: rowId, speaker: "you", text }]);
    }
    appendTranscriptEntry({
      speaker: isWsda ? `You (${youRoleTag})` : `${youDisplayName} (You)`,
      text,
      at: postedAt,
    });
    setDraft("");
    if (!isWsda) {
      if (soloTimeExpiredRef.current) return;
      setSoloUsedFallback(false);
      setSoloFallbackReason(null);
      setSoloAwaitingReply(true);
      void (async () => {
        const controller = new AbortController();
        soloReplyAbortRef.current = controller;
        const result = await requestSoloOpponentReply(
          transcriptRef.current,
          controller.signal,
        );
        if (soloReplyAbortRef.current === controller) {
          soloReplyAbortRef.current = null;
        }
        if (result.aborted || soloTimeExpiredRef.current || result.reply === null) {
          setSoloAwaitingReply(false);
          return;
        }
        const at = new Date().toISOString();
        soloRowIdRef.current += 1;
        const rowId = soloRowIdRef.current;
        setSoloUsedFallback(result.usedFallback);
        setSoloFallbackReason(result.reason);
        setSoloChatRows((prev) => [
          ...prev,
          {
            id: rowId,
            speaker: "opponent",
            text: result.reply,
            replySource: result.usedFallback ? "fallback" : "deepseek",
          },
        ]);
        appendTranscriptEntry({
          speaker: opponentName,
          text: result.reply,
          at,
        });
        setSoloAwaitingReply(false);
      })();
    }
  }

  const footerHint =
    roundComplete
      ? "Round complete. Use End to leave or review results."
      : !isWsda && soloTimeExpired
        ? "Time is up. Solo debate has ended."
      : !isWsda && soloAwaitingReply
        ? "Opponent is responding..."
      : inputLocked
        ? inputDisabledHint ??
          "You cannot type during this segment."
        : null;
  const currentSessionCopy =
    isWsda && !roundComplete ? wsdaRoundChatCopy(phaseIndex) : null;

  return (
    <>
      {currentSessionCopy ? (
        <div className="w-full border-y-2 border-orange-700 bg-orange-950/85 px-4 py-3 shadow-[0_4px_0px_0px_rgba(0,0,0,0.35)] md:px-6">
          <p className="pixel-text-xs font-black uppercase text-orange-400">
            Current session {currentSessionCopy.roundNumber} of{" "}
            {currentSessionCopy.totalRounds}
          </p>
          <p className="pixel-text-xs mt-2 font-bold uppercase tracking-wide text-white whitespace-nowrap">
            {currentSessionCopy.headline}
          </p>
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="pixel-bg-grid relative max-h-[min(700px,55vh)] flex-1 space-y-10 overflow-y-auto p-4 md:p-6"
      >
        {!isWsda
          ? soloChatRows.map((row) => {
              const isSelf = row.speaker === "you";
              return (
                <div
                  key={row.id}
                  className={
                    isSelf
                      ? "flex flex-row-reverse items-start gap-4"
                      : "flex items-start gap-4"
                  }
                >
                  <div
                    className={`h-12 w-12 flex-shrink-0 border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14 ${
                      isSelf
                        ? "border-red-500 bg-primary"
                        : "border-red-600 bg-red-900"
                    }`}
                  >
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={isSelf ? yourAvatarUrl : opponentAvatarUrl}
                    />
                  </div>
                  <div
                    className={`max-w-[85%] border-2 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5 ${
                      isSelf
                        ? "border-on-primary-fixed-variant bg-primary-fixed/90"
                        : "border-red-900/50 bg-black/80"
                    }`}
                  >
                    <span
                      className={`pixel-text-xs mb-3 block font-bold uppercase ${
                        isSelf
                          ? "text-right text-on-primary-fixed-variant"
                          : "text-orange-400"
                      }`}
                    >
                      {isSelf ? `${youDisplayName} (You)` : opponentName}
                    </span>
                    {!isSelf && row.replySource ? (
                      <span
                        className={`mb-3 inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          row.replySource === "fallback"
                            ? "border-orange-700 bg-orange-950/60 text-orange-300"
                            : "border-emerald-700 bg-emerald-950/60 text-emerald-300"
                        }`}
                        title={
                          row.replySource === "fallback"
                            ? "Backup response generated locally because AI call failed."
                            : "Response generated by DeepSeek API."
                        }
                      >
                        {row.replySource === "fallback"
                          ? "Fallback Reply"
                          : "DeepSeek Reply"}
                      </span>
                    ) : null}
                    <p
                      className={`pixel-text-xs leading-loose whitespace-pre-wrap ${
                        isSelf ? "text-on-primary-container" : "text-stone-200"
                      }`}
                    >
                      {row.text}
                    </p>
                  </div>
                </div>
              );
            })
          : null}

        {isWsda && roundComplete ? (
          <div className="flex justify-center">
            <div className="max-w-[95%] border-2 border-stone-600 bg-stone-900/90 px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
              <p className="pixel-text-xs font-black uppercase text-stone-400">
                Debate complete
              </p>
              <p className="pixel-text-xs mt-2 font-medium leading-relaxed text-stone-300 normal-case">
                All WSDA segments have finished. Thank both sides.
              </p>
            </div>
          </div>
        ) : null}

        {arenaRoomId && isWsda
          ? wsdaArenaTimeline.map((row) => {
              if (row.kind === "system") {
                return (
                  <div key={row.key} className="flex justify-center px-1">
                    <div className="max-w-[min(100%,52rem)] border-2 border-orange-700/60 bg-orange-950/50 px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.45)] md:px-5">
                      <p className="pixel-text-xs font-black uppercase tracking-wide text-orange-400">
                        System
                      </p>
                      <p className="pixel-text-xs mt-2 font-medium leading-relaxed whitespace-pre-wrap text-stone-200 normal-case">
                        {row.text}
                      </p>
                    </div>
                  </div>
                );
              }
              if (row.kind !== "arena") {
                return null;
              }
              const m = row.msg;
              const isSelf =
                arenaUserId != null && m.user_id === arenaUserId;
              return (
                <div
                  key={m.id}
                  className={
                    isSelf
                      ? "flex flex-row-reverse items-start gap-4"
                      : "flex items-start gap-4"
                  }
                >
                  <div
                    className={`h-12 w-12 flex-shrink-0 border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14 ${
                      isSelf
                        ? "border-red-500 bg-primary"
                        : "border-red-600 bg-red-900"
                    }`}
                  >
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={isSelf ? yourAvatarUrl : opponentAvatarUrl}
                    />
                  </div>
                  <div
                    className={`max-w-[85%] border-2 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5 ${
                      isSelf
                        ? "border-on-primary-fixed-variant bg-primary-fixed/90"
                        : "border-red-900/50 bg-black/80"
                    }`}
                  >
                    <span
                      className={`pixel-text-xs mb-3 block font-bold uppercase ${
                        isSelf
                          ? "text-right text-on-primary-fixed-variant"
                          : "text-orange-400"
                      }`}
                    >
                      {isSelf
                        ? `You (${youRoleTag})`
                        : `${opponentName} (${opponentRoleTag})`}
                    </span>
                    <p
                      className={`pixel-text-xs leading-loose whitespace-pre-wrap ${
                        isSelf ? "text-on-primary-container" : "text-stone-200"
                      }`}
                    >
                      {m.body}
                    </p>
                  </div>
                </div>
              );
            })
          : null}

        {!arenaRoomId && isWsda
          ? wsdaLocalTimeline.map((row) => {
              if (row.kind === "system") {
                return (
                  <div key={row.key} className="flex justify-center px-1">
                    <div className="max-w-[min(100%,52rem)] border-2 border-orange-700/60 bg-orange-950/50 px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.45)] md:px-5">
                      <p className="pixel-text-xs font-black uppercase tracking-wide text-orange-400">
                        System
                      </p>
                      <p className="pixel-text-xs mt-2 font-medium leading-relaxed whitespace-pre-wrap text-stone-200 normal-case">
                        {row.text}
                      </p>
                    </div>
                  </div>
                );
              }
              if (row.kind === "opening") {
                const e = row.entry;
                const isYou = e.speaker.startsWith("You ");
                return isYou ? (
                  <div
                    key={`opening-${e.at}`}
                    className="flex flex-row-reverse items-start gap-4"
                  >
                    <div className="h-12 w-12 flex-shrink-0 border-4 border-red-500 bg-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14">
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={yourAvatarUrl}
                      />
                    </div>
                    <div className="max-w-[85%] border-2 border-on-primary-fixed-variant bg-primary-fixed/90 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5">
                      <span className="pixel-text-xs mb-3 block text-right font-bold uppercase text-on-primary-fixed-variant">
                        {e.speaker} — Pro Constructive
                      </span>
                      <p className="pixel-text-xs leading-loose text-on-primary-container">
                        {e.text}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    key={`opening-${e.at}`}
                    className="flex items-start gap-4"
                  >
                    <div className="h-12 w-12 flex-shrink-0 border-4 border-red-600 bg-red-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14">
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={opponentAvatarUrl}
                      />
                    </div>
                    <div className="max-w-[85%] border-2 border-red-900/50 bg-black/80 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5">
                      <span className="pixel-text-xs mb-3 block font-bold uppercase text-orange-400">
                        {e.speaker} — Pro Constructive
                      </span>
                      <p className="pixel-text-xs leading-loose text-stone-200">{e.text}</p>
                    </div>
                  </div>
                );
              }
              if (row.kind === "local") {
                return (
                  <div
                    key={row.id}
                    className="flex flex-row-reverse items-start gap-4"
                  >
                    <div className="h-12 w-12 flex-shrink-0 border-4 border-red-500 bg-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14">
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={yourAvatarUrl}
                      />
                    </div>
                    <div className="max-w-[85%] border-2 border-on-primary-fixed-variant bg-primary-fixed/90 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5">
                      <span className="pixel-text-xs mb-3 block text-right font-bold uppercase text-on-primary-fixed-variant">
                        {`You (${youRoleTag})`}
                      </span>
                      <p className="pixel-text-xs leading-loose whitespace-pre-wrap text-on-primary-container">
                        {row.text}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })
          : null}

        {visibleSimConPosts.map(({ id, text }) => (
          <div key={id} className="flex items-start gap-4">
            <div className="h-12 w-12 flex-shrink-0 border-4 border-tertiary bg-tertiary/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14">
              <img
                alt=""
                className="h-full w-full object-cover"
                src={opponentAvatarUrl}
              />
            </div>
            <div className="max-w-[85%] border-2 border-tertiary/60 bg-[#0a1628]/90 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5">
              <span className="pixel-text-xs mb-3 block font-bold uppercase text-tertiary-fixed">
                {opponentName} (Con) — simulated
              </span>
              <p className="pixel-text-xs leading-loose text-stone-200 whitespace-pre-wrap">
                {text}
              </p>
            </div>
          </div>
        ))}

        <div className="pixel-text-xs ml-4 flex items-center gap-3 italic text-orange-700 md:ml-16">
          <span className="h-2 w-2 animate-pulse bg-red-900" />
          <span className="h-2 w-2 animate-pulse bg-red-800 [animation-delay:75ms]" />
          <span className="h-2 w-2 animate-pulse bg-red-700 [animation-delay:150ms]" />
          {isWsda
            ? roundComplete
              ? "Debate finished — all WSDA segments complete."
              : arenaRoomId
                ? "Live arena — messages sync between both players."
                : simulateConOpponent
                  ? "Opponent (Con) is simulated in chat — you cannot type while Con is speaking."
                  : userCanPost && !roundComplete
                    ? "Your side may speak — stay within the rules for this phase."
                    : inputDisabledHint ?? "Wait for your turn."
            : soloAwaitingReply
              ? "Opponent is drafting a rebuttal..."
              : "Ready for your next argument."}
        </div>
        {!isWsda && soloUsedFallback ? (
          <div
            className="ml-4 mt-2 inline-flex items-center border border-orange-700 bg-orange-950/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-300 md:ml-16"
            title={soloFallbackReason ?? "AI reply fallback used"}
          >
            AI unavailable - using backup response. Retrying next turn.
          </div>
        ) : null}
      </div>

      <div className="border-t-8 border-orange-600 bg-red-950 p-4 shadow-[0_-10px_20px_rgba(255,69,0,0.2)] md:p-6">
        {footerHint ? (
          <p className="pixel-text-xs mb-3 border-2 border-stone-700 bg-stone-900/80 px-3 py-2 text-center font-bold uppercase tracking-wide text-stone-400">
            {footerHint}
          </p>
        ) : null}
        <form
          className={`flex items-center gap-3 border-4 border-black bg-stone-900 p-3 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.5)] ${
            inputLocked ? "opacity-75" : ""
          }`}
          onSubmit={(e) => {
            e.preventDefault();
            postMessage();
          }}
        >
          <span className="ml-2 font-bold text-orange-900">&gt;</span>
          <input
            className="pixel-text-xs flex-1 border-none bg-transparent text-orange-500 placeholder:text-red-900 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={
              inputLocked
                ? footerHint ?? "Input locked"
                : "Toss argument..."
            }
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Your argument"
            autoComplete="off"
            disabled={inputLocked}
          />
          <div className="flex shrink-0 gap-2">
            <button
              type="submit"
              disabled={inputLocked}
              className="border-b-4 border-orange-950 bg-orange-700 px-4 py-2 text-white pixel-text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] transition-all enabled:active:translate-y-1 enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 md:px-8 md:py-3"
            >
              POST
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
