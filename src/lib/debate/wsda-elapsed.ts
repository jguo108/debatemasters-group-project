import { WSDA_PHASES } from "@/lib/debate/wsda-schedule";

/** Derive current WSDA segment from seconds since server-anchored debate start. */
export function wsdaStateFromElapsedSeconds(elapsedSec: number): {
  phaseIndex: number;
  secondsLeft: number;
  isComplete: boolean;
} {
  let t = Math.max(0, elapsedSec);
  for (let i = 0; i < WSDA_PHASES.length; i++) {
    const d = WSDA_PHASES[i].durationSec;
    if (t < d) {
      const remaining = d - t;
      return {
        phaseIndex: i,
        secondsLeft: Math.max(0, Math.ceil(remaining - 1e-9)),
        isComplete: false,
      };
    }
    t -= d;
  }
  return {
    phaseIndex: WSDA_PHASES.length - 1,
    secondsLeft: 0,
    isComplete: true,
  };
}
