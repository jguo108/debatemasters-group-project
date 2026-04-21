"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { DebateResultDetail } from "@/components/results/DebateResultDetail";
import { MaterialIcon } from "@/components/MaterialIcon";
import { useCombinedDebateHistory } from "@/lib/data/history-storage";

function formatDebateWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

export default function DebateHistoryDetailPage() {
  const params = useParams<{ debateId: string }>();
  const debateId = typeof params?.debateId === "string" ? params.debateId : "";
  const history = useCombinedDebateHistory();
  const r = useMemo(
    () => history.find((item) => item.id === debateId),
    [debateId, history],
  );

  if (!r && history.length === 0) {
    return (
      <div className="relative z-20 mx-auto max-w-5xl px-6 py-10 md:px-12">
        <Link
          href="/results"
          className="brick-sans inline-flex items-center gap-2 border-b-4 border-r-4 border-black bg-[#2D1B19] px-4 py-3 font-black uppercase tracking-widest text-[#58B13E] transition-all hover:bg-[#3a2824] hover:brightness-110 active:translate-y-1 active:border-0"
        >
          <MaterialIcon name="arrow_back" className="text-lg text-[#58B13E]" />
          DEBATE HISTORY
        </Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-stone-300">
          Loading debate result...
        </p>
      </div>
    );
  }

  if (!r) {
    return (
      <div className="relative z-20 mx-auto max-w-5xl px-6 py-10 md:px-12">
        <Link
          href="/results"
          className="brick-sans inline-flex items-center gap-2 border-b-4 border-r-4 border-black bg-[#2D1B19] px-4 py-3 font-black uppercase tracking-widest text-[#58B13E] transition-all hover:bg-[#3a2824] hover:brightness-110 active:translate-y-1 active:border-0"
        >
          <MaterialIcon name="arrow_back" className="text-lg text-[#58B13E]" />
          DEBATE HISTORY
        </Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-stone-300">
          Debate result not found.
        </p>
      </div>
    );
  }

  const dateLabel = formatDebateWhen(r.debatedAt);

  return (
    <>
      <div className="relative z-20 mx-auto max-w-5xl px-6 pt-8 md:px-12 md:pt-10">
        <Link
          href="/results"
          className="brick-sans inline-flex items-center gap-2 border-b-4 border-r-4 border-black bg-[#2D1B19] px-4 py-3 font-black uppercase tracking-widest text-[#58B13E] transition-all hover:bg-[#3a2824] hover:brightness-110 active:translate-y-1 active:border-0"
        >
          <MaterialIcon name="arrow_back" className="text-lg text-[#58B13E]" />
          DEBATE HISTORY
        </Link>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-stone-500">
          {dateLabel}
        </p>
      </div>
      <DebateResultDetail r={r} />
    </>
  );
}
