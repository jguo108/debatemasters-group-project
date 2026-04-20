/**
 * Data access layer — swap implementations when moving from mock → Supabase + Vercel.
 *
 * 1. Install `@supabase/supabase-js`.
 * 2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 * 3. Implement the Supabase-backed functions below and branch on env in each export.
 */
import {
  mockDebateHistory,
  mockDebateSession,
  mockTopics,
  mockUser,
} from "./mock/fixtures";
import { WSDA_PHASES, formatMmSs, wsdaPhaseBanner } from "../debate/wsda-schedule";
import type {
  DebateResult,
  DebateSession,
  TopicCategory,
  UserProfile,
} from "./types";

const ARENA_OPPONENTS = [
  "CrimsonOrator",
  "NetherKnight_Debate",
  "BlazeBriefBuilder",
  "SoulSandSpeaker",
  "WitherWordsmith",
] as const;

function pickArenaOpponent(): string {
  const i = Math.floor(Math.random() * ARENA_OPPONENTS.length);
  return ARENA_OPPONENTS[i] ?? ARENA_OPPONENTS[0];
}

function buildWsdaSession(topicTitle: string): DebateSession {
  const first = WSDA_PHASES[0];
  const userRole: "pro" | "con" = Math.random() < 0.5 ? "pro" : "con";
  return {
    ...mockDebateSession,
    id: `debate_wsda_${Date.now()}`,
    topicTitle,
    locationLabel: "WSDA Arena — Matched round",
    phaseLabel: wsdaPhaseBanner(0),
    timerMmSs: first ? formatMmSs(first.durationSec) : "02:00",
    phaseDurationSeconds: first?.durationSec ?? 120,
    debateFormat: "wsda",
    opponentName: pickArenaOpponent(),
    userRole,
  };
}

export function getMockUser(): UserProfile {
  return mockUser;
}

export function getMockTopics(): TopicCategory[] {
  return mockTopics;
}

export function getMockDebateSession(): DebateSession {
  return mockDebateSession;
}

/** Resolves mock debate session with the topic chosen on `/topics` (or custom title). */
export function getDebateSessionForTopic(
  topicId: string | null | undefined,
  customTitle: string | null | undefined,
  format: string | null | undefined,
): DebateSession {
  const base: DebateSession = { ...mockDebateSession };
  const id = topicId?.trim();
  const isWsda = format?.trim().toLowerCase() === "wsda";

  if (id === "custom") {
    const t = customTitle?.trim();
    const title = t || "Custom topic";
    if (isWsda) {
      return buildWsdaSession(title);
    }
    return {
      ...base,
      topicTitle: title,
    };
  }

  if (!id) {
    return base;
  }

  const topic = mockTopics.find((t) => t.id === id);
  if (!topic) {
    return base;
  }

  if (isWsda) {
    return buildWsdaSession(topic.description);
  }

  return {
    ...base,
    topicTitle: topic.description,
  };
}

export function getDebateHistory(): DebateResult[] {
  return mockDebateHistory;
}

export function getDebateResultById(id: string): DebateResult | undefined {
  return mockDebateHistory.find((d) => d.id === id);
}

/** @deprecated Use getDebateHistory / getDebateResultById */
export function getMockDebateResult(): DebateResult {
  return mockDebateHistory[0];
}
