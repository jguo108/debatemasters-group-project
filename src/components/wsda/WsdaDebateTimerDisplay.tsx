"use client";

import { DebateRoomTimer } from "@/components/DebateRoomTimer";
import { useWsdaDebate } from "./WsdaDebateProvider";

/** Phase countdown — place below the topic in the debate header. */
export function WsdaDebateTimerDisplay() {
  const { session, secondsLeft } = useWsdaDebate();

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <DebateRoomTimer
        isSoloAi={false}
        staticMmSs={session.timerMmSs}
        controlledSeconds={secondsLeft}
        compact
      />
    </div>
  );
}
