"use client";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";
import { readStoredDebateHistory } from "@/lib/data/history-storage";
import type { DebateResult } from "@/lib/data/types";

const MIGRATION_FLAG_KEY = "debate-supabase-migrated-v1";

function migrationDone(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MIGRATION_FLAG_KEY) === "1";
}

function setMigrationDone(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MIGRATION_FLAG_KEY, "1");
}

/** One-time import of local debate history after first successful login. Does not touch profile (avoids overwriting signup data with stale localStorage). */
export async function migrateLocalDataToSupabaseIfNeeded(): Promise<void> {
  if (!isSupabaseConfigured() || typeof window === "undefined") return;
  if (migrationDone()) return;

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  const userId = session.user.id;

  const debates = readStoredDebateHistory();
  for (const d of debates) {
    const row = debateResultToRow(userId, d);
    const { error } = await supabase.from("debate_results").insert(row);
    if (error && error.code !== "23505") {
      console.warn("migrateLocalDataToSupabase:", error.message);
    }
  }

  setMigrationDone();
}

function debateResultToRow(userId: string, result: DebateResult) {
  const row: Record<string, unknown> = {
    id: result.id,
    user_id: userId,
    payload: result as unknown as Record<string, unknown>,
    debated_at: result.debatedAt,
    hidden: false,
  };
  if (result.arenaRoomId) {
    row.arena_room_id = result.arenaRoomId;
  }
  return row;
}
