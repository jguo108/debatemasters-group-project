import { NextResponse } from "next/server";
import { buildLocalAiJudgedResult } from "@/lib/data/ai-results";
import type { AgeBand, DebateResult, DebateTranscriptEntry } from "@/lib/data/types";
import { judgeDebateAndFeedback } from "@/lib/llm/tasks";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/browser-client";

type FinalizeDebateBody = {
  sessionId?: unknown;
  topicTitle?: unknown;
  userRole?: unknown;
  debateFormat?: unknown;
  arenaRoomId?: unknown;
  ageBand?: unknown;
  transcript?: unknown;
};

function normalizeAgeBand(value: unknown): AgeBand {
  return value === "under10" ||
    value === "10-14" ||
    value === "15-18" ||
    value === "18+"
    ? value
    : "10-14";
}

function normalizeTranscript(value: unknown): DebateTranscriptEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof (entry as Record<string, unknown>).speaker === "string" &&
        typeof (entry as Record<string, unknown>).text === "string" &&
        typeof (entry as Record<string, unknown>).at === "string",
    )
    .map((entry) => ({
      speaker: String((entry as Record<string, unknown>).speaker),
      text: String((entry as Record<string, unknown>).text),
      at: String((entry as Record<string, unknown>).at),
    }));
}

async function persistArenaJudgement(input: {
  arenaRoomId: string;
  topicTitle: string;
  debateFormat?: "wsda";
  transcript: DebateTranscriptEntry[];
  judge: Awaited<ReturnType<typeof judgeDebateAndFeedback>>;
}): Promise<DebateResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Must be authenticated to finalize arena debates.");
  }

  const judgementPayload = {
    topic_title: input.topicTitle,
    debate_format: input.debateFormat ?? null,
    transcript: input.transcript,
    winner_side: input.judge.winner,
    confidence: input.judge.confidence,
    rationale: input.judge.rationale,
    feedback: input.judge.feedback,
    quote: input.judge.quote,
    clarity_score: input.judge.scores.clarity,
    evidence_score: input.judge.scores.evidence,
  };
  const { data, error } = await supabase.rpc("arena_store_judged_result", {
    p_room: input.arenaRoomId,
    p_judgement: judgementPayload,
  });
  if (error) {
    throw new Error(error.message);
  }
  const row = data as {
    status?: string;
    payload?: DebateResult;
    message?: string;
  };
  if (row?.status === "error") {
    throw new Error(row.message ?? "Failed to store judged result.");
  }
  if (!row?.payload || typeof row.payload !== "object") {
    throw new Error("Arena judged result payload missing.");
  }
  return row.payload;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FinalizeDebateBody;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const topicTitle = typeof body.topicTitle === "string" ? body.topicTitle.trim() : "";
    const userRole = body.userRole === "con" ? "con" : "pro";
    const debateFormat = body.debateFormat === "wsda" ? "wsda" : undefined;
    const ageBand = normalizeAgeBand(body.ageBand);
    const arenaRoomId =
      typeof body.arenaRoomId === "string" ? body.arenaRoomId.trim() : "";
    const transcript = normalizeTranscript(body.transcript);

    if (!sessionId || !topicTitle) {
      return NextResponse.json(
        { ok: false, error: "sessionId and topicTitle are required." },
        { status: 400 },
      );
    }
    if (transcript.length === 0) {
      return NextResponse.json(
        { ok: false, error: "transcript is required." },
        { status: 400 },
      );
    }

    const judgement = await judgeDebateAndFeedback({
      topicTitle,
      debateFormat,
      userRole,
      ageBand,
      transcript,
    });

    if (arenaRoomId) {
      if (!isSupabaseConfigured()) {
        return NextResponse.json(
          { ok: false, error: "Arena judging requires Supabase configuration." },
          { status: 500 },
        );
      }
      const payload = await persistArenaJudgement({
        arenaRoomId,
        topicTitle,
        debateFormat,
        transcript,
        judge: judgement,
      });
      return NextResponse.json({
        ok: true,
        persisted: true,
        result: payload,
      });
    }

    const result = buildLocalAiJudgedResult({
      sessionId,
      topicTitle,
      userRole,
      transcript,
      debateFormat,
      judgement,
    });

    return NextResponse.json({
      ok: true,
      persisted: false,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to finalize debate.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
