"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { writeActiveDebateTranscript } from "@/lib/data/history-storage";
import { pickConSimLine } from "@/lib/debate/con-sim-lines";
import {
  formatMmSs,
  proConstructiveOpening,
  wsdaRoundChatCopy,
} from "@/lib/debate/wsda-schedule";
import {
  pickMinecraftAvatarBySeed,
  useUserProfile,
} from "@/lib/data/profile-storage";
import type { DebateTranscriptEntry } from "@/lib/data/types";

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
}: DebateChatPanelProps) {
  const user = useUserProfile();
  const [draft, setDraft] = useState("");
  const [userPosts, setUserPosts] = useState<{ id: number; text: string }[]>([]);
  const [simConPosts, setSimConPosts] = useState<
    { id: number; text: string; phaseIndex: number }[]
  >([]);
  const transcriptRef = useRef<DebateTranscriptEntry[]>([]);
  const postIdRef = useRef(0);
  const simPostIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedTranscriptRef = useRef(false);
  const announcedPhaseIndicesRef = useRef<Set<number>>(new Set());

  const isWsda =
    debateFormat === "wsda" &&
    Boolean(topicTitle?.trim()) &&
    (userRole === "pro" || userRole === "con");

  const proSpeech = topicTitle?.trim()
    ? proConstructiveOpening(topicTitle.trim())
    : "";
  const youDisplayName = user.displayName || "Master Builder";
  const yourAvatarUrl = user.avatarUrl;
  const opponentAvatarUrl = useMemo(
    () => pickMinecraftAvatarBySeed(opponentName || "opponent"),
    [opponentName],
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
    },
    [setTranscriptEntries],
  );

  useEffect(() => {
    if (initializedTranscriptRef.current) return;
    initializedTranscriptRef.current = true;
    const now = new Date().toISOString();

    if (isWsda) {
      const initial: DebateTranscriptEntry[] = [
        {
          speaker: "System",
          text: `Debate opened: ${topicTitle?.trim() || "WSDA round"}`,
          at: now,
        },
      ];
      const copy = wsdaRoundChatCopy(phaseIndex);
      if (copy) {
        initial.push({
          speaker: "System",
          text: `Session ${copy.roundNumber}/${copy.totalRounds}: ${copy.headline}. ${copy.purpose} ${copy.instruction}`,
          at: now,
        });
        announcedPhaseIndicesRef.current.add(phaseIndex);
      }
      if (phaseIndex === 0 && proSpeech) {
        const openingSpeaker =
          userRole === "pro" ? "You (Pro)" : `${opponentName} (Pro)`;
        initial.push({
          speaker: openingSpeaker,
          text: proSpeech,
          at: now,
        });
      }
      setTranscriptEntries(initial);
      return;
    }

    setTranscriptEntries([
      {
        speaker: "System",
        text: `Debate opened: ${topicTitle?.trim() || phaseLabel}`,
        at: now,
      },
      {
        speaker: opponentName,
        text: "Automation is the inevitable bedrock of progress. Every tool we've crafted-from the shovel to the piston-has served structural efficiency.",
        at: now,
      },
      {
        speaker: `${youDisplayName} (You)`,
        text: "But tools don't design the building. If we outsource 'why' to an algorithm, we aren't building-we're spectating.",
        at: now,
      },
      {
        speaker: "System",
        text: phaseLabel,
        at: now,
      },
    ]);
  }, [
    appendTranscriptEntry,
    isWsda,
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
    if (!isWsda) return;
    if (announcedPhaseIndicesRef.current.has(phaseIndex)) return;
    const copy = wsdaRoundChatCopy(phaseIndex);
    if (!copy) return;
    announcedPhaseIndicesRef.current.add(phaseIndex);
    appendTranscriptEntry({
      speaker: "System",
      text: `Session ${copy.roundNumber}/${copy.totalRounds}: ${copy.headline}. ${copy.purpose} ${copy.instruction}`,
      at: new Date().toISOString(),
    });
  }, [appendTranscriptEntry, isWsda, phaseIndex]);

  useEffect(() => {
    if (!roundComplete || !isWsda) return;
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

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [
    userPosts.length,
    visibleSimConPosts.length,
    phaseIndex,
    isWsda,
    roundComplete,
  ]);

  const youRoleTag = userRole === "pro" ? "Pro" : "Con";
  const inputLocked = roundComplete || !userCanPost;

  function postMessage() {
    if (inputLocked) return;
    const text = draft.trim();
    if (!text) return;
    postIdRef.current += 1;
    setUserPosts((prev) => [...prev, { id: postIdRef.current, text }]);
    appendTranscriptEntry({
      speaker: isWsda ? `You (${youRoleTag})` : `${youDisplayName} (You)`,
      text,
      at: new Date().toISOString(),
    });
    setDraft("");
  }

  const footerHint =
    roundComplete
      ? "Round complete. Use End to leave or review results."
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
        {isWsda && phaseIndex === 0 ? (
          userRole === "pro" ? (
            <div className="flex flex-row-reverse items-start gap-4">
              <div className="h-12 w-12 flex-shrink-0 border-4 border-red-500 bg-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14">
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={yourAvatarUrl}
                />
              </div>
              <div className="max-w-[85%] border-2 border-on-primary-fixed-variant bg-primary-fixed/90 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5">
                <span className="pixel-text-xs mb-3 block text-right font-bold uppercase text-on-primary-fixed-variant">
                  You (Pro) — Pro Constructive
                </span>
                <p className="pixel-text-xs leading-loose text-on-primary-container">
                  {proSpeech}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 flex-shrink-0 border-4 border-red-600 bg-red-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14">
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={opponentAvatarUrl}
                />
              </div>
              <div className="max-w-[85%] border-2 border-red-900/50 bg-black/80 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5">
                <span className="pixel-text-xs mb-3 block font-bold uppercase text-orange-400">
                  {opponentName} (Pro) — Pro Constructive
                </span>
                <p className="pixel-text-xs leading-loose text-stone-200">
                  {proSpeech}
                </p>
              </div>
            </div>
          )
        ) : null}

        {!isWsda ? (
          <>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 flex-shrink-0 border-4 border-red-600 bg-red-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14">
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={opponentAvatarUrl}
                />
              </div>
              <div className="max-w-[85%] border-2 border-red-900/50 bg-black/80 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5">
                <span className="pixel-text-xs mb-3 block font-bold uppercase text-orange-400">
                  {opponentName}
                </span>
                <p className="pixel-text-xs leading-loose text-stone-200">
                  Automation is the inevitable bedrock of progress. Every tool we&apos;ve
                  crafted—from the shovel to the piston—has served structural efficiency.
                </p>
              </div>
            </div>

            <div className="flex flex-row-reverse items-start gap-4">
              <div className="h-12 w-12 flex-shrink-0 border-4 border-red-500 bg-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14">
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={yourAvatarUrl}
                />
              </div>
              <div className="max-w-[85%] border-2 border-on-primary-fixed-variant bg-primary-fixed/90 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5">
                <span className="pixel-text-xs mb-3 block text-right font-bold uppercase text-on-primary-fixed-variant">
                  {youDisplayName} (You)
                </span>
                <p className="pixel-text-xs leading-loose text-on-primary-container">
                  But tools don&apos;t design the building. If we outsource &apos;why&apos; to an
                  algorithm, we aren&apos;t building—we&apos;re spectating.
                </p>
              </div>
            </div>
          </>
        ) : null}

        {!isWsda ? (
          <div className="flex justify-center">
            <div className="border-2 border-orange-600 bg-orange-950/90 px-4 py-2 pixel-text-xs font-bold uppercase tracking-widest text-orange-400 shadow-lg md:px-6">
              System: {phaseLabel}
            </div>
          </div>
        ) : null}

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

        {userPosts.map(({ id, text }) => (
          <div key={id} className="flex flex-row-reverse items-start gap-4">
            <div className="h-12 w-12 flex-shrink-0 border-4 border-red-500 bg-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] md:h-14 md:w-14">
              <img
                alt=""
                className="h-full w-full object-cover"
                src={yourAvatarUrl}
              />
            </div>
            <div className="max-w-[85%] border-2 border-on-primary-fixed-variant bg-primary-fixed/90 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] backdrop-blur-md md:p-5">
              <span className="pixel-text-xs mb-3 block text-right font-bold uppercase text-on-primary-fixed-variant">
                {isWsda ? `You (${youRoleTag})` : `${youDisplayName} (You)`}
              </span>
              <p className="pixel-text-xs leading-loose text-on-primary-container whitespace-pre-wrap">
                {text}
              </p>
            </div>
          </div>
        ))}

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
              : simulateConOpponent
                ? "Opponent (Con) is simulated in chat — you cannot type while Con is speaking."
                : userCanPost && !roundComplete
                  ? "Your side may speak — stay within the rules for this phase."
                  : inputDisabledHint ?? "Wait for your turn."
            : "Mining response..."}
        </div>
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
