"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { OpponentExitNoticeModal } from "@/components/debate/OpponentExitNoticeModal";
import type { DebateSession } from "@/lib/data/types";
import {
  appendDebateResultToHistory,
  createOpponentVictoryByForfeitResult,
} from "@/lib/data/history-storage";
import { getUserProfileSnapshot } from "@/lib/data/profile-storage";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";

export function FreeFormArenaProvider({
  session,
  children,
}: {
  session: DebateSession;
  children: ReactNode;
}) {
  const router = useRouter();
  const [opponentWinResultId, setOpponentWinResultId] = useState<string | null>(null);
  const opponentForfeitHandledRef = useRef(false);

  useEffect(() => {
    const roomId = session.arenaRoomId;
    if (!roomId || !isSupabaseConfigured()) return;

    const supabase = createClient();
    let cancelled = false;
    let claimLock = false;

    function applyOpponentWin(forfeitedBy: string | null | undefined) {
      if (!forfeitedBy || opponentForfeitHandledRef.current) return;
      if (claimLock) return;
      claimLock = true;
      void (async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (cancelled || !user) return;
          if (forfeitedBy === user.id) return;
          if (opponentForfeitHandledRef.current) return;

          opponentForfeitHandledRef.current = true;
          const result = createOpponentVictoryByForfeitResult({
            sessionId: session.id,
            topicTitle: session.topicTitle,
            opponentName: session.opponentName,
            userRole: session.userRole,
            debateFormat: session.debateFormat,
            arenaRoomId: roomId,
            selfUserId: user.id,
            totalExperienceBefore: getUserProfileSnapshot().totalExperience,
          });
          await appendDebateResultToHistory(result);
          setOpponentWinResultId(result.id);
        } finally {
          claimLock = false;
        }
      })();
    }

    void (async () => {
      const { data, error } = await supabase
        .from("debate_rooms")
        .select("forfeited_by_user_id")
        .eq("id", roomId)
        .maybeSingle();
      if (cancelled || error) return;
      applyOpponentWin(data?.forfeited_by_user_id ?? null);
    })();

    const channel = supabase
      .channel(`debate_room_free_form_forfeit_listener:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "debate_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const fid = (payload.new as { forfeited_by_user_id?: string | null })
            ?.forfeited_by_user_id;
          applyOpponentWin(fid);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [
    session.arenaRoomId,
    session.debateFormat,
    session.id,
    session.opponentName,
    session.topicTitle,
    session.userRole,
  ]);

  return (
    <>
      <OpponentExitNoticeModal
        open={opponentWinResultId !== null}
        opponentName={session.opponentName}
        modalRootId="debate-chat-area"
        onOk={() => {
          if (opponentWinResultId) {
            router.push(`/results/${encodeURIComponent(opponentWinResultId)}`);
          }
          setOpponentWinResultId(null);
        }}
      />
      {children}
    </>
  );
}
