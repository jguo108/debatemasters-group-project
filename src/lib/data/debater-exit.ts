"use client";

import { arenaRecordForfeit } from "@/lib/data/arena-forfeit";
import {
  appendDebateResultToHistory,
  createForfeitResult,
  createOpponentVictoryByForfeitResult,
  type ForfeitMeta,
} from "@/lib/data/history-storage";
import { getUserProfileSnapshot } from "@/lib/data/profile-storage";
import { createClient } from "@/lib/supabase/browser-client";

export type DebaterExitOutcome =
  | { type: "forfeit"; resultId: string }
  | { type: "victory_forfeit"; resultId: string }
  | { type: "already_self" };

/**
 * Ends the debate for the current user: notifies arena opponents when applicable,
 * writes history, and returns how to navigate.
 */
export async function recordDebaterExit(meta: ForfeitMeta): Promise<DebaterExitOutcome> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const withSelf: ForfeitMeta = {
    ...meta,
    selfUserId: user?.id,
    totalExperienceBefore: getUserProfileSnapshot().totalExperience,
  };
  const roomId = meta.arenaRoomId;
  if (roomId) {
    const { kind } = await arenaRecordForfeit(roomId);
    if (kind === "you_win_by_opponent_forfeit") {
      const r = createOpponentVictoryByForfeitResult(withSelf);
      await appendDebateResultToHistory(r);
      return { type: "victory_forfeit", resultId: r.id };
    }
    if (kind === "already_forfeited_self") {
      return { type: "already_self" };
    }
  }
  const r = createForfeitResult(withSelf);
  await appendDebateResultToHistory(r);
  return { type: "forfeit", resultId: r.id };
}
