"use client";

import {
  appendDebateResultToHistory,
  readActiveDebateTranscript,
  type ForfeitMeta,
} from "@/lib/data/history-storage";
import type { DebateResult } from "@/lib/data/types";

type FinalizeDebateOutcome =
  | { ok: true; resultId: string }
  | { ok: false; error: string };

type FinalizeDebateResponse = {
  ok?: boolean;
  persisted?: boolean;
  error?: string;
  result?: DebateResult;
};

export async function finalizeDebateWithAi(
  sessionMeta: ForfeitMeta,
): Promise<FinalizeDebateOutcome> {
  const transcript = readActiveDebateTranscript(sessionMeta.sessionId);
  const res = await fetch("/api/ai/finalize-debate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionMeta.sessionId,
      topicTitle: sessionMeta.topicTitle,
      userRole: sessionMeta.userRole,
      debateFormat: sessionMeta.debateFormat,
      arenaRoomId: sessionMeta.arenaRoomId,
      transcript,
    }),
  });

  const data = (await res.json()) as FinalizeDebateResponse;
  if (!res.ok || !data.ok || !data.result) {
    return {
      ok: false,
      error: data.error ?? "Could not generate AI judgment.",
    };
  }

  if (!data.persisted) {
    await appendDebateResultToHistory(data.result);
  }

  return { ok: true, resultId: data.result.id };
}
