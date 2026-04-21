"use client";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";

export type ArenaForfeitRpcKind =
  | "you_forfeited"
  | "already_forfeited_self"
  | "you_win_by_opponent_forfeit";

export async function arenaRecordForfeit(roomId: string): Promise<{
  ok: boolean;
  kind: ArenaForfeitRpcKind | null;
  errorMessage?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { ok: true, kind: null };
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("arena_record_forfeit", {
    p_room: roomId,
  });
  if (error) {
    console.warn("arena_record_forfeit:", error.message);
    return { ok: false, kind: null, errorMessage: error.message };
  }
  const d = data as {
    status?: string;
    kind?: string;
    message?: string;
  };
  if (d?.status === "error") {
    return {
      ok: false,
      kind: null,
      errorMessage: typeof d.message === "string" ? d.message : "error",
    };
  }
  const kind = d?.kind as ArenaForfeitRpcKind | undefined;
  if (
    kind === "you_forfeited" ||
    kind === "already_forfeited_self" ||
    kind === "you_win_by_opponent_forfeit"
  ) {
    return { ok: true, kind };
  }
  return { ok: true, kind: null };
}
