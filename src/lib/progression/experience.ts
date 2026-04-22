/**
 * Player progression — must stay aligned with Supabase:
 * public.compute_debate_experience_reward, public.level_from_total_experience,
 * public.advancement_title_from_level (0014_progression_experience.sql).
 */

import type { DebateResult } from "@/lib/data/types";

/** Cumulative XP required to reach this player level (level 1 starts at 0). */
export function xpAtStartOfLevel(level: number): number {
  if (level < 1) return 0;
  return 50 * (level - 1) * level;
}

export function levelFromTotalExperience(total: number): number {
  const t = Math.max(0, total);
  return Math.max(1, Math.floor(0.5 + Math.sqrt(0.25 + t / 50)));
}

export function advancementTitleFromLevel(level: number): string {
  if (level <= 1) return "Spawn Runner";
  if (level === 2) return "Wooden Debater";
  if (level === 3) return "Stone Tongue";
  if (level === 4) return "Iron Clash";
  if (level === 5) return "Golden Glyph";
  if (level === 6) return "Lapis Logician";
  if (level === 7) return "Redstone Rhetor";
  if (level === 8) return "Emerald Advocate";
  if (level === 9) return "Diamond Cross-Examiner";
  if (level === 10) return "Nether Scribe";
  if (level === 11) return "Soul Speed Speaker";
  if (level === 12) return "Ancient Debris Orator";
  if (level === 13) return "Basalt Debater";
  if (level === 14) return "Blackstone Barrister";
  if (level === 15) return "End Walker";
  if (level === 16) return "Dragonfire Closer";
  return "Dragonfire Closer";
}

export function xpProgressWithinLevel(totalExperience: number): {
  intoLevel: number;
  xpForNextLevel: number;
  level: number;
} {
  const level = levelFromTotalExperience(totalExperience);
  const start = xpAtStartOfLevel(level);
  const intoLevel = Math.max(0, totalExperience - start);
  const xpForNextLevel = Math.max(1, 100 * level);
  return { intoLevel, xpForNextLevel, level };
}

export function computeDebateExperienceReward(input: {
  outcome: DebateResult["outcome"];
  arenaRoomId?: string | null | undefined;
  scores?: { clarity: number; evidence: number };
}): number {
  const o = input.outcome;
  if (o === "forfeit") return 5;

  const base = input.arenaRoomId ? 80 : 60;
  const outcomeBonus = o === "victory" ? 45 : 20;
  const clarity = input.scores?.clarity ?? 0;
  const evidence = input.scores?.evidence ?? 0;
  const scoreBonus = Math.min(
    15,
    Math.max(0, Math.floor(((clarity + evidence) / 2) * 3)),
  );
  return base + outcomeBonus + scoreBonus;
}

/** Fields stored on DebateResult after a match (preview matches server grant). */
export function progressionFieldsAfterMatch(input: {
  totalExperienceBefore: number;
  outcome: DebateResult["outcome"];
  arenaRoomId?: string | null | undefined;
  scores?: { clarity: number; evidence: number };
}): Pick<DebateResult, "level" | "xpCurrent" | "xpToNext" | "xpEarned"> {
  const xpEarned = computeDebateExperienceReward({
    outcome: input.outcome,
    arenaRoomId: input.arenaRoomId,
    scores: input.scores,
  });
  const after = Math.max(0, input.totalExperienceBefore + xpEarned);
  const { intoLevel, xpForNextLevel, level } = xpProgressWithinLevel(after);
  return {
    xpEarned,
    level,
    xpCurrent: intoLevel,
    xpToNext: xpForNextLevel,
  };
}
