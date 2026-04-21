"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DebateRoomTimer } from "@/components/DebateRoomTimer";
import { finalizeDebateWithAi } from "@/lib/data/debate-finalize";
import { recordDebaterExit } from "@/lib/data/debater-exit";
import type { ForfeitMeta } from "@/lib/data/history-storage";

export function SoloDebateTimeoutTimer({
  sessionMeta,
  staticMmSs,
  soloTotalSeconds,
  compact = false,
}: {
  sessionMeta: ForfeitMeta;
  staticMmSs: string;
  soloTotalSeconds?: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [didExpire, setDidExpire] = useState(false);

  return (
    <>
      <DebateRoomTimer
        isSoloAi
        staticMmSs={staticMmSs}
        soloTotalSeconds={soloTotalSeconds}
        compact={compact}
        onSoloElapsed={() => {
          if (didExpire) return;
          setDidExpire(true);
          window.dispatchEvent(
            new CustomEvent("solo-debate-time-up", {
              detail: { sessionId: sessionMeta.sessionId },
            }),
          );
          setShowTimeoutModal(true);
        }}
      />
      {showTimeoutModal ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Debate time is up"
            className="w-full max-w-md border-4 border-red-900 bg-[#1a0505] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] md:p-5"
          >
            <p className="pixel-text-xs font-black uppercase tracking-wide text-orange-500">
              Time Is Up
            </p>
            <p className="pixel-text-xs mt-3 leading-relaxed text-stone-200 normal-case">
              Your solo debate timer has ended. Click OK to view your summary
              and feedback.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={isResolving}
                onClick={() => {
                  if (isResolving) return;
                  setIsResolving(true);
                  void (async () => {
                    try {
                      const judged = await finalizeDebateWithAi(sessionMeta);
                      if (judged.ok) {
                        router.push(
                          `/results/${encodeURIComponent(judged.resultId)}`,
                        );
                        return;
                      }
                      const outcome = await recordDebaterExit(sessionMeta);
                      if (outcome.type === "already_self") {
                        router.push("/results");
                        return;
                      }
                      router.push(`/results/${encodeURIComponent(outcome.resultId)}`);
                    } finally {
                      setIsResolving(false);
                    }
                  })();
                }}
                className="border-b-4 border-orange-900 bg-orange-600 px-4 py-2 pixel-text-xs font-black uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.45)] transition-all enabled:hover:bg-orange-500 enabled:active:translate-y-1 enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResolving ? "Loading..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
