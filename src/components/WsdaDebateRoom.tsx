"use client";

import { useMemo } from "react";
import { DebateChatPanel } from "@/components/DebateChatPanel";
import { useWsdaDebate } from "@/components/wsda/WsdaDebateProvider";

export function WsdaDebateRoom() {
  const {
    session,
    phaseIndex,
    phaseLabel,
    inputHint,
    userCanPost,
    isComplete,
    activeSpeaker,
    secondsLeft,
  } = useWsdaDebate();

  const simulateConOpponent = useMemo(
    () =>
      !session.arenaRoomId &&
      session.userRole === "pro" &&
      activeSpeaker === "con" &&
      !isComplete,
    [session.arenaRoomId, session.userRole, activeSpeaker, isComplete],
  );

  return (
    <DebateChatPanel
      sessionId={session.id}
      opponentName={session.opponentName}
      phaseLabel={phaseLabel}
      debateFormat="wsda"
      topicTitle={session.topicTitle}
      userRole={session.userRole}
      phaseIndex={phaseIndex}
      userCanPost={userCanPost && !isComplete}
      inputDisabledHint={inputHint}
      secondsLeft={secondsLeft}
      roundComplete={isComplete}
      simulateConOpponent={simulateConOpponent}
      arenaRoomId={session.arenaRoomId}
      selfAvatarUrl={session.selfAvatarUrl}
      opponentAvatarUrl={session.opponentAvatarUrl}
    />
  );
}
