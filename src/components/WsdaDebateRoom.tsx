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
      session.userRole === "pro" &&
      activeSpeaker === "con" &&
      !isComplete,
    [session.userRole, activeSpeaker, isComplete],
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
    />
  );
}
