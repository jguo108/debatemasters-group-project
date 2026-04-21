"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";

export type ArenaRoomMessageRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export function useArenaRoomMessages(roomId: string | undefined) {
  const [messages, setMessages] = useState<ArenaRoomMessageRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const mergeRows = useCallback((rows: ArenaRoomMessageRow[]) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const r of rows) {
        if (byId.has(r.id)) continue;
        byId.set(r.id, r);
      }
      return [...byId.values()].sort(
        (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
      );
    });
  }, []);

  useEffect(() => {
    if (!roomId || !isSupabaseConfigured()) {
      setMessages([]);
      setCurrentUserId(null);
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    setMessages([]);

    const channel = supabase
      .channel(`debate_room_messages:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "debate_room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as ArenaRoomMessageRow | null;
          if (!row?.id || !row.user_id || typeof row.body !== "string") return;
          mergeRows([row]);
        },
      )
      .subscribe();

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("debate_room_messages")
        .select("id,user_id,body,created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (cancelled || error) {
        if (error) console.warn("debate_room_messages fetch:", error.message);
        return;
      }
      if (data?.length) {
        mergeRows(data as ArenaRoomMessageRow[]);
      }
    })();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId, mergeRows]);

  const send = useCallback(
    async (body: string) => {
      if (!roomId || !isSupabaseConfigured()) return { error: "not_configured" as const };
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: "not_authed" as const };

      const trimmed = body.trim();
      if (!trimmed) return { error: "empty" as const };

      const { error } = await supabase.from("debate_room_messages").insert({
        room_id: roomId,
        user_id: user.id,
        body: trimmed,
      });
      if (error) {
        console.warn("debate_room_messages insert:", error.message);
        return { error: "insert_failed" as const, message: error.message };
      }
      return { error: null as null };
    },
    [roomId],
  );

  return { messages, currentUserId, send };
}
