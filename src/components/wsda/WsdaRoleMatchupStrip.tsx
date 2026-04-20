"use client";

import { DebateRoleMatchupStrip } from "@/components/debate/DebateRoleMatchupStrip";
import { useWsdaDebate } from "./WsdaDebateProvider";

export function WsdaRoleMatchupStrip() {
  const { session } = useWsdaDebate();

  return (
    <DebateRoleMatchupStrip
      userRole={session.userRole}
      opponentName={session.opponentName}
    />
  );
}
