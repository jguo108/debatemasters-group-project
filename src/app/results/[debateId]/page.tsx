"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DebateResultDetail } from "@/components/results/DebateResultDetail";
import { MaterialIcon } from "@/components/MaterialIcon";
import {
  normalizeDebateResult,
  useCombinedDebateHistory,
} from "@/lib/data/history-storage";
import type { DebateResult } from "@/lib/data/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser-client";

export default function DebateHistoryDetailPage() {
  const params = useParams<{ debateId: string }>();
  const debateId = typeof params?.debateId === "string" ? params.debateId : "";
  const history = useCombinedDebateHistory();
  const [directResult, setDirectResult] = useState<DebateResult | null>(null);
  const [resolvedMissing, setResolvedMissing] = useState(false);
  const r = useMemo(
    () => history.find((item) => item.id === debateId),
    [debateId, history],
  );

  useEffect(() => {
    if (!debateId || r || directResult || resolvedMissing) return;
    if (!isSupabaseConfigured()) {
      setResolvedMissing(true);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      for (let i = 0; i < 8; i += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) break;

        const { data } = await supabase
          .from("debate_results")
          .select("payload")
          .eq("id", debateId)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (cancelled) return;
        if (data?.payload) {
          setDirectResult(normalizeDebateResult(data.payload as DebateResult));
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 700));
      }

      if (!cancelled) {
        setResolvedMissing(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debateId, directResult, r, resolvedMissing]);

  const resolvedResult = r ?? directResult;

  if (!resolvedResult && history.length === 0 && !resolvedMissing) {
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

  if (!resolvedResult) {
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
      </div>
      <DebateResultDetail r={resolvedResult} />
    </>
  );
}
