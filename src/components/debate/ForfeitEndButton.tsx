"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ForfeitMeta } from "@/lib/data/history-storage";
import { recordDebaterExit } from "@/lib/data/debater-exit";
import { DebateEndConfirmModal } from "@/components/debate/DebateEndConfirmModal";

export function ForfeitEndButton({
  sessionMeta,
  className,
  children,
  ariaLabel,
  confirmMessage = "End this debate now? You can review results afterwards.",
  modalRootId,
}: {
  sessionMeta: ForfeitMeta;
  className: string;
  children: React.ReactNode;
  ariaLabel?: string;
  confirmMessage?: string;
  modalRootId?: string;
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
