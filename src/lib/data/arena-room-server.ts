import { createClient } from "@/lib/supabase/server";
import { buildArenaDebateSession } from "@/lib/data/repository";
import type { DebateSession } from "@/lib/data/types";

export type ArenaRoomLoadResult =
  | { ok: true; session: DebateSession }
  | { ok: false; reason: "not_found" | "forbidden" | "unauthenticated" };

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
    .select("id, topic_title, pro_user_id, con_user_id")
    .eq("id", roomId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, reason: "not_found" };
  }

  if (row.pro_user_id !== user.id && row.con_user_id !== user.id) {
    return { ok: false, reason: "forbidden" };
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
      topicTitle: row.topic_title,
      opponentName,
      userRole,
      selfAvatarUrl: selfAvatarUrl || undefined,
      opponentAvatarUrl: opponentAvatarUrl || undefined,
    }),
  };
}
