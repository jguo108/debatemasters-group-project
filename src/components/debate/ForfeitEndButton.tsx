"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  appendDebateResultToHistory,
  createForfeitResult,
  type ForfeitMeta,
} from "@/lib/data/history-storage";
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
          const result = createForfeitResult(sessionMeta);
          await appendDebateResultToHistory(result);
          router.push(`/results/${encodeURIComponent(result.id)}`);
        }}
      />
    </>
  );
}
