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

function parseRequestedRole(
  role: string | null | undefined,
): "pro" | "con" | undefined {
  const v = role?.trim().toLowerCase();
  if (v === "pro" || v === "con") return v;
  return undefined;
}

function parseRequestedSoloDurationSeconds(
  durationMinutes: string | null | undefined,
): number | undefined {
  const value = Number.parseInt(durationMinutes?.trim() ?? "", 10);
  if (value === 1 || value === 3 || value === 5 || value === 10 || value === 15) {
    return value * 60;
  }
  return undefined;
}

function buildWsdaSession(
  topicTitle: string,
  preferredRole?: "pro" | "con",
): DebateSession {
  const first = WSDA_PHASES[0];
  const userRole: "pro" | "con" =
    preferredRole ?? (Math.random() < 0.5 ? "pro" : "con");
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
/** Live arena room from DB — topic + opponent resolved server-side. */
export function buildArenaDebateSession(input: {
  roomId: string;
  topicTitle: string;
  opponentName: string;
  userRole: "pro" | "con";
  selfAvatarUrl?: string;
  opponentAvatarUrl?: string;
}): DebateSession {
  const first = WSDA_PHASES[0];
  return {
    ...mockDebateSession,
    id: `debate_arena_${input.roomId}`,
    arenaRoomId: input.roomId,
    topicTitle: input.topicTitle,
    locationLabel: "WSDA Arena — Live match",
    phaseLabel: wsdaPhaseBanner(0),
    timerMmSs: first ? formatMmSs(first.durationSec) : "02:00",
    phaseDurationSeconds: first?.durationSec ?? 120,
    debateFormat: "wsda",
    opponentName: input.opponentName,
    userRole: input.userRole,
    selfAvatarUrl: input.selfAvatarUrl,
    opponentAvatarUrl: input.opponentAvatarUrl,
  };
}

export function getDebateSessionForTopic(
  topicId: string | null | undefined,
  customTitle: string | null | undefined,
  format: string | null | undefined,
  requestedRole?: string | null | undefined,
  requestedDurationMinutes?: string | null | undefined,
): DebateSession {
  const base: DebateSession = { ...mockDebateSession };
  const id = topicId?.trim();
  const isWsda = format?.trim().toLowerCase() === "wsda";
  const selectedRole = parseRequestedRole(requestedRole);
  const selectedSoloDurationSeconds = parseRequestedSoloDurationSeconds(
    requestedDurationMinutes,
  );

  if (id === "custom") {
    const t = customTitle?.trim();
    const title = t || "Custom topic";
    if (isWsda) {
      return buildWsdaSession(title, selectedRole);
    }
    return {
      ...base,
      topicTitle: title,
      timerMmSs: selectedSoloDurationSeconds
        ? formatMmSs(selectedSoloDurationSeconds)
        : base.timerMmSs,
      soloDurationSeconds: selectedSoloDurationSeconds,
      userRole: selectedRole ?? base.userRole,
    };
  }

  if (!id) {
    return {
      ...base,
      timerMmSs: selectedSoloDurationSeconds
        ? formatMmSs(selectedSoloDurationSeconds)
        : base.timerMmSs,
      soloDurationSeconds: selectedSoloDurationSeconds,
      userRole: selectedRole ?? base.userRole,
    };
  }

  const topic = mockTopics.find((t) => t.id === id);
  if (!topic) {
    return {
      ...base,
      timerMmSs: selectedSoloDurationSeconds
        ? formatMmSs(selectedSoloDurationSeconds)
        : base.timerMmSs,
      soloDurationSeconds: selectedSoloDurationSeconds,
      userRole: selectedRole ?? base.userRole,
    };
  }

  if (isWsda) {
    return buildWsdaSession(topic.description, selectedRole);
  }

  return {
    ...base,
    topicTitle: topic.description,
    timerMmSs: selectedSoloDurationSeconds
      ? formatMmSs(selectedSoloDurationSeconds)
      : base.timerMmSs,
    soloDurationSeconds: selectedSoloDurationSeconds,
    userRole: selectedRole ?? base.userRole,
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
