export type AgeBand = "under10" | "10-14" | "15-18" | "18+";

export type DebatePath = "solo" | "arena";

export interface UserProfile {
  id: string;
  displayName: string;
  level: number;
  rankLabel: string;
  avatarUrl: string;
}

export interface TopicCategory {
  id: string;
  title: string;
  description: string;
  badge: string;
  icon: "bolt" | "pets" | "rocket_launch" | "memory" | "eco";
  accent: "primary" | "tertiary";
  wide?: boolean;
  backgroundImageUrl?: string;
}

export interface DebateSession {
  id: string;
  topicTitle: string;
  locationLabel: string;
  phaseLabel: string;
  timerMmSs: string;
  opponentName: string;
  userRole: "pro" | "con";
  /** When set, debate room uses WSDA segment timing instead of solo AI clock. */
  debateFormat?: "wsda";
  /** Initial segment length for live countdown (WSDA). */
  phaseDurationSeconds?: number;
  /** Supabase `debate_rooms.id` — enables live chat sync between matched players. */
  arenaRoomId?: string;
  /** From `profiles` — live arena only; correct headshots in chat vs local/mock defaults. */
  selfAvatarUrl?: string;
  opponentAvatarUrl?: string;
}

export interface DebateTranscriptEntry {
  speaker: string;
  text: string;
  at: string;
}

export interface DebateResult {
  id: string;
  /** When set, this debate is tied to a live arena room — enables paired purge when both players hide history. */
  arenaRoomId?: string;
  /** Topic line for history list and headers */
  topicTitle: string;
  /** ISO date string (e.g. for sorting / display) */
  debatedAt: string;
  outcome: "victory" | "effort" | "forfeit";
  headline: string;
  subline: string;
  level: number;
  xpCurrent: number;
  xpToNext: number;
  xpEarned: number;
  feedback: string;
  quote: string;
  scores: { clarity: number; evidence: number };
  suggestedTomes: {
    title: string;
    subtitle: string;
    kind: "enchanted" | "rare";
    label: string;
    accent: "tertiary" | "primary";
    icon: "menu_book" | "psychology";
  }[];
  loot: { label: string; tone: "gold" | "emerald" }[];
  transcript: DebateTranscriptEntry[];
}
