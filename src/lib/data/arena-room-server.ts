import { createClient } from "@/lib/supabase/server";
import { buildArenaDebateSession } from "@/lib/data/repository";
import type { AgeBand, DebateSession } from "@/lib/data/types";
import { pickRandomMatchTopic } from "@/lib/debate/random-match-topics";
import { normalizeArenaDebateFormat } from "@/lib/matchmaking/arena";

export type ArenaRoomLoadResult =
  | { ok: true; session: DebateSession }
  | { ok: false; reason: "not_found" | "forbidden" | "unauthenticated" };

function normalizeAgeBand(value: unknown): AgeBand {
  return value === "under10" ||
    value === "10-14" ||
    value === "15-18" ||
    value === "18+"
    ? value
    : "10-14";
}

export async function loadArenaDebateSession(roomId: string): Promise<ArenaRoomLoadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data: row, error } = await supabase
    .from("debate_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, reason: "not_found" };
  }

  if (row.pro_user_id !== user.id && row.con_user_id !== user.id) {
    return { ok: false, reason: "forbidden" };
  }

  const debateFormat = normalizeArenaDebateFormat(row.debate_format, "wsda");
  let topicTitle = row.topic_title;
  const hasTopicGeneratedField = Object.prototype.hasOwnProperty.call(row, "topic_generated");
  if (hasTopicGeneratedField && row.topic_generated === false) {
    const { data: queue } = await supabase
      .from("arena_queue")
      .select("preferred_age_band")
      .eq("user_id", user.id)
      .eq("room_id", roomId)
      .maybeSingle();
    const ageBand = normalizeAgeBand(queue?.preferred_age_band);
    const fallbackTopic = pickRandomMatchTopic(debateFormat, ageBand);
    const { data: updated, error: updateError } = await supabase
      .from("debate_rooms")
      .update({
        topic_title: fallbackTopic,
        topic_generated: true,
      })
      .eq("id", roomId)
      .eq("topic_generated", false)
      .select("topic_title")
      .maybeSingle();
    if (!updateError && updated?.topic_title) {
      topicTitle = updated.topic_title;
    } else if (updateError) {
      console.warn("arena-room topic fallback update failed:", updateError.message);
    }
  }

  const opponentId =
    row.pro_user_id === user.id ? row.con_user_id : row.pro_user_id;

  const [{ data: selfProfile }, { data: oppProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", opponentId)
      .maybeSingle(),
  ]);

  const opponentName = oppProfile?.display_name?.trim() || "Player";
  const userRole: "pro" | "con" = row.pro_user_id === user.id ? "pro" : "con";

  const selfAvatarUrl = selfProfile?.avatar_url?.trim();
  const opponentAvatarUrl = oppProfile?.avatar_url?.trim();

  return {
    ok: true,
    session: buildArenaDebateSession({
      roomId: row.id,
      topicTitle,
      opponentName,
      userRole,
      debateFormat,
      selfAvatarUrl: selfAvatarUrl || undefined,
      opponentAvatarUrl: opponentAvatarUrl || undefined,
    }),
  };
}
