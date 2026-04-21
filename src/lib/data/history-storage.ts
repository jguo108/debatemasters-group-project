"use client";

import { useSyncExternalStore } from "react";
import { mockDebateHistory } from "@/lib/data/mock/fixtures";
import type { DebateResult, DebateTranscriptEntry } from "@/lib/data/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";

export const HISTORY_STORAGE_KEY = "debate-history-v1";
const HISTORY_HIDDEN_IDS_KEY = "debate-history-hidden-ids-v1";
const ACTIVE_TRANSCRIPT_PREFIX = "debate-active-transcript:";
const historyListeners = new Set<() => void>();
/** Stable snapshot while auth-backed history is loading — `[]` literals break useSyncExternalStore. */
const EMPTY_DEBATE_HISTORY: DebateResult[] = [];
let cachedStorageRaw: string | null = null;
let cachedHistorySnapshot: DebateResult[] | null = null;

let sessionMode: "unknown" | "guest" | "authed" = "unknown";
let fetchingAuthed = false;
let supabaseHistoryRows: DebateResult[] | null = null;
let resolveStarted = false;
let authHistoryHooked = false;

function notifyHistoryListeners(): void {
  historyListeners.forEach((listener) => listener());
}

export type ForfeitMeta = {
  sessionId: string;
  topicTitle: string;
  opponentName: string;
  userRole?: "pro" | "con";
  debateFormat?: "wsda";
};

function fallbackTranscript(
  result: Pick<DebateResult, "topicTitle" | "headline" | "subline" | "debatedAt">,
): DebateTranscriptEntry[] {
  return [
    {
      speaker: "System",
      text: `Debate opened: ${result.topicTitle}`,
      at: result.debatedAt,
    },
    {
      speaker: "System",
      text: `${result.headline} — ${result.subline}`,
      at: result.debatedAt,
    },
  ];
}

export function normalizeDebateResult(value: DebateResult): DebateResult {
  return {
    ...value,
    transcript:
      Array.isArray(value.transcript) && value.transcript.length > 0
        ? value.transcript
        : fallbackTranscript(value),
  };
}

function isDebateResult(value: unknown): value is DebateResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.topicTitle === "string" &&
    typeof v.debatedAt === "string" &&
    (v.outcome === "victory" || v.outcome === "effort" || v.outcome === "forfeit") &&
    typeof v.headline === "string" &&
    typeof v.subline === "string"
  );
}

export function readStoredDebateHistory(): DebateResult[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDebateResult).map(normalizeDebateResult);
  } catch {
    return [];
  }
}

function writeStoredDebateHistory(history: DebateResult[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  notifyHistoryListeners();
}

function readHiddenDebateIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = window.localStorage.getItem(HISTORY_HIDDEN_IDS_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v) => typeof v === "string"));
  } catch {
    return new Set();
  }
}

function writeHiddenDebateIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_HIDDEN_IDS_KEY, JSON.stringify([...ids]));
}

function mergeLocalAndMock(): DebateResult[] {
  const stored = readStoredDebateHistory();
  const hiddenIds = readHiddenDebateIds();
  const existingIds = new Set(stored.map((r) => r.id));
  const merged = [
    ...stored.filter((r) => !hiddenIds.has(r.id)),
    ...mockDebateHistory
      .filter((r) => !existingIds.has(r.id) && !hiddenIds.has(r.id))
      .map(normalizeDebateResult),
  ];
  return merged.sort((a, b) => +new Date(b.debatedAt) - +new Date(a.debatedAt));
}

function mergeServerSide(): DebateResult[] {
  const stored: DebateResult[] = [];
  const hiddenIds = new Set<string>();
  const existingIds = new Set(stored.map((r) => r.id));
  const merged = [
    ...stored.filter((r) => !hiddenIds.has(r.id)),
    ...mockDebateHistory
      .filter((r) => !existingIds.has(r.id) && !hiddenIds.has(r.id))
      .map(normalizeDebateResult),
  ];
  return merged.sort((a, b) => +new Date(b.debatedAt) - +new Date(a.debatedAt));
}

async function resolveHistoryFromAuth(): Promise<void> {
  if (!isSupabaseConfigured()) {
    sessionMode = "guest";
    supabaseHistoryRows = null;
    fetchingAuthed = false;
    notifyHistoryListeners();
    return;
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    sessionMode = "guest";
    supabaseHistoryRows = null;
    fetchingAuthed = false;
    notifyHistoryListeners();
    return;
  }

  sessionMode = "authed";
  fetchingAuthed = true;
  notifyHistoryListeners();

  const { data, error } = await supabase
    .from("debate_results")
    .select("payload")
    .eq("user_id", session.user.id)
    .eq("hidden", false)
    .order("debated_at", { ascending: false });

  fetchingAuthed = false;
  if (error) {
    supabaseHistoryRows = [];
  } else {
    supabaseHistoryRows = (data ?? []).map((row) =>
      normalizeDebateResult(row.payload as DebateResult),
    );
  }
  notifyHistoryListeners();
}

function ensureHistoryAuthListener(): void {
  if (authHistoryHooked || !isSupabaseConfigured()) return;
  authHistoryHooked = true;
  const supabase = createClient();
  supabase.auth.onAuthStateChange(() => {
    sessionMode = "unknown";
    supabaseHistoryRows = null;
    resolveStarted = false;
    void ensureHistoryResolved();
  });
}

async function ensureHistoryResolved(): Promise<void> {
  if (resolveStarted) return;
  resolveStarted = true;
  try {
    await resolveHistoryFromAuth();
  } catch {
    resolveStarted = false;
    sessionMode = "guest";
    supabaseHistoryRows = null;
    notifyHistoryListeners();
  }
}

export async function appendDebateResultToHistory(
  result: DebateResult,
): Promise<DebateResult[]> {
  const normalized = normalizeDebateResult(result);

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from("debate_results").insert({
        id: normalized.id,
        user_id: session.user.id,
        payload: normalized as unknown as Record<string, unknown>,
        debated_at: normalized.debatedAt,
        hidden: false,
      });
      if (error) {
        console.warn("appendDebateResultToHistory:", error.message);
      }
      sessionMode = "authed";
      fetchingAuthed = false;
      if (supabaseHistoryRows) {
        supabaseHistoryRows = [
          normalized,
          ...supabaseHistoryRows.filter((r) => r.id !== normalized.id),
        ].sort((a, b) => +new Date(b.debatedAt) - +new Date(a.debatedAt));
      } else {
        supabaseHistoryRows = [normalized];
      }
      notifyHistoryListeners();
      return getCombinedDebateHistory();
    }
  }

  const current = readStoredDebateHistory();
  const next = [normalized, ...current.filter((r) => r.id !== normalized.id)];
  const hiddenIds = readHiddenDebateIds();
  if (hiddenIds.has(normalized.id)) {
    hiddenIds.delete(normalized.id);
    writeHiddenDebateIds(hiddenIds);
  }
  writeStoredDebateHistory(next);
  return getCombinedDebateHistory();
}

export async function removeDebateResultFromHistory(id: string): Promise<DebateResult[]> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from("debate_results")
        .update({ hidden: true })
        .eq("id", id)
        .eq("user_id", session.user.id);
      if (supabaseHistoryRows) {
        supabaseHistoryRows = supabaseHistoryRows.filter((r) => r.id !== id);
      }
      notifyHistoryListeners();
      return getCombinedDebateHistory();
    }
  }

  const current = readStoredDebateHistory();
  const next = current.filter((r) => r.id !== id);
  const hiddenIds = readHiddenDebateIds();
  hiddenIds.add(id);
  writeHiddenDebateIds(hiddenIds);
  writeStoredDebateHistory(next);
  return getCombinedDebateHistory();
}

export function getCombinedDebateHistory(): DebateResult[] {
  if (typeof window === "undefined") {
    return mergeServerSide();
  }

  ensureHistoryAuthListener();
  void ensureHistoryResolved();

  if (isSupabaseConfigured() && sessionMode === "authed" && fetchingAuthed) {
    return EMPTY_DEBATE_HISTORY;
  }
  if (isSupabaseConfigured() && sessionMode === "authed" && supabaseHistoryRows !== null) {
    return supabaseHistoryRows;
  }

  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    const hiddenRaw = window.localStorage.getItem(HISTORY_HIDDEN_IDS_KEY);
    const cacheKey = `${raw ?? ""}||${hiddenRaw ?? ""}`;
    if (cacheKey === cachedStorageRaw && cachedHistorySnapshot) {
      return cachedHistorySnapshot;
    }
    cachedStorageRaw = cacheKey;
  }

  const sorted = mergeLocalAndMock();
  if (typeof window !== "undefined") {
    cachedHistorySnapshot = sorted;
  }
  return sorted;
}

export function getCombinedDebateResultById(id: string): DebateResult | undefined {
  return getCombinedDebateHistory().find((r) => r.id === id);
}

export function writeActiveDebateTranscript(
  sessionId: string,
  transcript: DebateTranscriptEntry[],
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `${ACTIVE_TRANSCRIPT_PREFIX}${sessionId}`,
    JSON.stringify(transcript),
  );
}

export function readActiveDebateTranscript(sessionId: string): DebateTranscriptEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(`${ACTIVE_TRANSCRIPT_PREFIX}${sessionId}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof (entry as Record<string, unknown>).speaker === "string" &&
        typeof (entry as Record<string, unknown>).text === "string" &&
        typeof (entry as Record<string, unknown>).at === "string",
    ) as DebateTranscriptEntry[];
  } catch {
    return [];
  }
}

function subscribeToHistory(callback: () => void): () => void {
  historyListeners.add(callback);
  void ensureHistoryResolved();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== HISTORY_STORAGE_KEY) return;
    callback();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    historyListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function useCombinedDebateHistory(): DebateResult[] {
  return useSyncExternalStore(
    subscribeToHistory,
    getCombinedDebateHistory,
    () => mockDebateHistory,
  );
}

export function createForfeitResult(meta: ForfeitMeta): DebateResult {
  const now = new Date();
  const yourSide = meta.userRole === "pro" ? "Pro" : "Con";
  const opponentSide = yourSide === "Pro" ? "Con" : "Pro";
  const formatTag = meta.debateFormat === "wsda" ? "WSDA" : "Standard";
  const id = `forfeit_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;

  const activeTranscript = readActiveDebateTranscript(meta.sessionId);
  const transcript =
    activeTranscript.length > 0
      ? activeTranscript
      : [
          {
            speaker: "System",
            text: `Debate opened: ${meta.topicTitle}`,
            at: now.toISOString(),
          },
          {
            speaker: "System",
            text: "Debate ended immediately because End was clicked.",
            at: now.toISOString(),
          },
        ];

  transcript.push({
    speaker: "System",
    text: `Forfeit recorded. Winner: ${meta.opponentName} (${opponentSide}).`,
    at: now.toISOString(),
  });

  return {
    id,
    topicTitle: meta.topicTitle,
    debatedAt: now.toISOString(),
    outcome: "forfeit",
    headline: "FORFEIT LOSS",
    subline: `You clicked End. ${meta.opponentName} (${opponentSide}) wins by forfeit.`,
    level: 42,
    xpCurrent: 2480,
    xpToNext: 3000,
    xpEarned: 20,
    feedback:
      `Debate ended early by manual End action. In this ${formatTag} round, clicking End counts as an immediate forfeit for your side (${yourSide}).`,
    quote:
      "Discipline wins rounds. Stay in until the clock and structure are complete.",
    scores: { clarity: 2.5, evidence: 2.2 },
    suggestedTomes: [
      {
        title: "Time Control Basics",
        subtitle: "Finish the full structure",
        kind: "rare",
        label: "+2 Focus",
        accent: "primary",
        icon: "menu_book",
      },
      {
        title: "Round Composure I",
        subtitle: "Play the full timer",
        kind: "enchanted",
        label: "+1 Lvl",
        accent: "tertiary",
        icon: "psychology",
      },
    ],
    loot: [{ label: "Consolation Coin x20", tone: "gold" }],
    transcript,
  };
}
