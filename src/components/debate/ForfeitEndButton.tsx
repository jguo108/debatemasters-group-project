"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ForfeitMeta } from "@/lib/data/history-storage";
import { recordDebaterExit } from "@/lib/data/debater-exit";
import { finalizeDebateWithAi } from "@/lib/data/debate-finalize";
import { DebateEndConfirmModal } from "@/components/debate/DebateEndConfirmModal";

export function ForfeitEndButton({
  sessionMeta,
  className,
  children,
  ariaLabel,
  confirmMessage = "End this debate now? You can review results afterwards.",
  modalRootId,
  resolveWithJudge = false,
}: {
  sessionMeta: ForfeitMeta;
  className: string;
  children: React.ReactNode;
  ariaLabel?: string;
  confirmMessage?: string;
  modalRootId?: string;
  resolveWithJudge?: boolean;
}) {
  const router = useRouter();
  const [isEnding, setIsEnding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={isEnding}
        className={className}
        onClick={() => {
          if (isEnding) return;
          setShowConfirm(true);
        }}
      >
        {children}
      </button>
      <DebateEndConfirmModal
        open={showConfirm}
        isBusy={isEnding}
        confirmMessage={confirmMessage}
        modalRootId={modalRootId}
        onCancel={() => setShowConfirm(false)}
        onConfirm={async () => {
          if (isEnding) return;
          setIsEnding(true);
          try {
            if (resolveWithJudge) {
              const judged = await finalizeDebateWithAi(sessionMeta);
              if (judged.ok) {
                router.push(`/results/${encodeURIComponent(judged.resultId)}`);
                return;
              }
            }
            const outcome = await recordDebaterExit(sessionMeta);
            if (outcome.type === "already_self") {
              router.push("/results");
              return;
            }
            router.push(`/results/${encodeURIComponent(outcome.resultId)}`);
          } finally {
            setIsEnding(false);
          }
        }}
      />
    </>
  );
}
