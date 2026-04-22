import { NextResponse } from "next/server";
import { pickRandomMatchTopic } from "@/lib/debate/random-match-topics";
import type { AgeBand } from "@/lib/data/types";
import { generateDebateTopic } from "@/lib/llm/tasks";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/browser-client";

type GenerateTopicBody = {
  debateFormat?: unknown;
  ageBand?: unknown;
  roomId?: unknown;
};

function normalizeAgeBand(value: unknown): AgeBand {
  return value === "under10" ||
    value === "10-14" ||
    value === "15-18" ||
    value === "18+"
    ? value
    : "10-14";
}

function normalizeFormat(value: unknown): "wsda" | "free_form" {
  return value === "free_form" ? "free_form" : "wsda";
}

async function chooseTopic(input: {
  debateFormat: "wsda" | "free_form";
  ageBand: AgeBand;
}): Promise<string> {
  try {
    const generated = await generateDebateTopic(input);
    if (generated.trim()) return generated.trim();
  } catch (error) {
    console.warn("generateDebateTopic failed, using fallback topic:", error);
  }
  return pickRandomMatchTopic(input.debateFormat, input.ageBand);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateTopicBody;
    const debateFormat = normalizeFormat(body.debateFormat);
    const ageBand = normalizeAgeBand(body.ageBand);
    const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";

    if (!roomId) {
      const topic = await chooseTopic({ debateFormat, ageBand });
      return NextResponse.json({ ok: true, topic });
    }

    if (!isSupabaseConfigured()) {
      const topic = await chooseTopic({ debateFormat, ageBand });
      return NextResponse.json({ ok: true, topic });
    }

    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Must be authenticated." }, { status: 401 });
    }

    const { data: room, error: roomError } = await supabase
      .from("debate_rooms")
      .select("id, debate_format, topic_title, topic_generated, pro_user_id, con_user_id")
      .eq("id", roomId)
      .maybeSingle();
    if (roomError || !room) {
      return NextResponse.json({ ok: false, error: "Room not found." }, { status: 404 });
    }
    if (room.pro_user_id !== user.id && room.con_user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Forbidden room access." }, { status: 403 });
    }
    if (room.topic_generated) {
      return NextResponse.json({ ok: true, topic: room.topic_title, persisted: true });
    }

    const formatFromRoom = normalizeFormat(room.debate_format);
    const topic = await chooseTopic({ debateFormat: formatFromRoom, ageBand });
    const { data: updated, error: updateError } = await supabase
      .from("debate_rooms")
      .update({
        topic_title: topic,
        topic_generated: true,
      })
      .eq("id", roomId)
      .eq("topic_generated", false)
      .select("topic_title")
      .maybeSingle();
    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message ?? "Could not update room topic." },
        { status: 500 },
      );
    }
    if (updated?.topic_title) {
      return NextResponse.json({ ok: true, topic: updated.topic_title, persisted: true });
    }

    const { data: current } = await supabase
      .from("debate_rooms")
      .select("topic_title")
      .eq("id", roomId)
      .maybeSingle();
    return NextResponse.json({
      ok: true,
      topic: current?.topic_title || topic,
      persisted: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate topic.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
