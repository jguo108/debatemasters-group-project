import type {
  DebateResult,
  DebateSession,
  TopicCategory,
  UserProfile,
} from "../types";

export const mockUser: UserProfile = {
  id: "user_1",
  displayName: "Master_Builder",
  level: 42,
  rankLabel: "Novice Builder",
  avatarUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBPMWnsk-CGiZsT0bXR8-Datn9g4nR7M2ug8UTqFgtGvGiwGBuPpJaxplbzPDDVxaFwTbrpaUVmrWByIGMZXNg1qvQDqzvKQHXqJT9sDqQYA854etFe9NNyybtTG2siJc6l5kexMPCzJmilFK07Vx_c6bXXxWtcuUV6l397W6-czfGjg3ZA-fFbdjiBIw82LYHoU57il1KOvgDT6eJP-apqVXMnMqZdfGyhfoVsv2_bpjGo6At7raLWdvg4WusY0PxyN9Mcqywxe4Q0",
};

export const mockTopics: TopicCategory[] = [
  {
    id: "superheroes",
    title: "SUPERHEROES",
    description: "Who is the ultimate guardian of the blocky city?",
    badge: "YOUNG ARCHITECTS",
    icon: "bolt",
    accent: "primary",
  },
  {
    id: "animals",
    title: "ANIMALS",
    description: "Cats vs Dogs: The eternal struggle for the best pet.",
    badge: "YOUNG ARCHITECTS",
    icon: "pets",
    accent: "primary",
  },
  {
    id: "video-games",
    title: "VIDEO GAMES",
    description:
      "Does gaming improve architectural thinking or just burn time?",
    badge: "POP CULTURE",
    icon: "rocket_launch",
    accent: "primary",
    wide: true,
    backgroundImageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDCViuLd4yOV9N9RA1kUOJmLkd_TxdV0FB1ZZJjVC-E2KT3NbT-jZPBWotI01FkWsX1jOWIxaecrK1s7QhCLg62SbxTd5rponyyEj6zZHHPqAUJfYiE8Szxwv4ias9wIClQ0I2ikAzmosjB0YqNKTY52kcQj88vlzW9Ye1rflSPuLFt7w-LW8qrnbUtKW7My7XzEzWmd0BfPlWH_6nDhyF-eMphAAI2DjbQse0_IhAy2J8aGaJtRxYRRHlUr7II3eAA0xhyZ_XK79fJ",
  },
  {
    id: "ai-tech",
    title: "AI TECH",
    description: "Will machines build our worlds better than humans?",
    badge: "MASTER BUILDERS",
    icon: "memory",
    accent: "tertiary",
  },
  {
    id: "climate",
    title: "CLIMATE",
    description: "Restoring biomes vs building new industrial zones.",
    badge: "MASTER BUILDERS",
    icon: "eco",
    accent: "tertiary",
  },
];

export const mockDebateSession: DebateSession = {
  id: "debate_1",
  topicTitle: "AI: Architect of the Future?",
  locationLabel: "Crimson Forest Outpost",
  phaseLabel: "Rebuttal Phase approaching",
  timerMmSs: "01:42",
  opponentName: "CreeperDestroyer99",
  userRole: "con",
};

const tomePair = (
  a: DebateResult["suggestedTomes"][0],
  b: DebateResult["suggestedTomes"][1],
): DebateResult["suggestedTomes"] => [a, b];

/** Past debates (newest first) — swap for API data later. */
export const mockDebateHistory: DebateResult[] = [
  {
    id: "ai-future",
    topicTitle: "AI: Architect of the Future?",
    debatedAt: "2026-04-18T20:30:00.000Z",
    outcome: "victory",
    headline: "EPIC VICTORY!",
    subline: "Your argument was impenetrable.",
    level: 42,
    xpCurrent: 2450,
    xpToNext: 3000,
    xpEarned: 450,
    feedback:
      'Your use of the "Sunk Cost" fallacy counter-argument was exceptionally well-timed. By identifying the opponent\'s emotional attachment to the failed logic, you successfully pivoted the debate back to core principles.',
    quote:
      "A master builder does not just stack blocks; they ensure the foundation can withstand the storm of contradiction.",
    scores: { clarity: 9.5, evidence: 8.8 },
    suggestedTomes: tomePair(
      {
        title: "Advanced Rhetoric IV",
        subtitle: "Mastering Persuasion",
        kind: "enchanted",
        label: "+5 Lvl",
        accent: "tertiary",
        icon: "menu_book",
      },
      {
        title: "Logic & Reason VI",
        subtitle: "Foundation of Truth",
        kind: "rare",
        label: "+12 Int",
        accent: "primary",
        icon: "psychology",
      },
    ),
    loot: [
      { label: "500 Gold Ingots", tone: "gold" },
      { label: "Debater's Badge", tone: "emerald" },
    ],
    transcript: [
      {
        speaker: "System",
        text: "Debate opened: AI: Architect of the Future?",
        at: "2026-04-18T20:30:00.000Z",
      },
      {
        speaker: "Opponent",
        text: "Automation raises productivity, safety, and scale in modern building ecosystems.",
        at: "2026-04-18T20:31:20.000Z",
      },
      {
        speaker: "You",
        text: "Automation still needs human judgment on ethics, context, and long-term tradeoffs.",
        at: "2026-04-18T20:32:04.000Z",
      },
      {
        speaker: "System",
        text: "Round ended. Judges favored your final weighing.",
        at: "2026-04-18T20:38:51.000Z",
      },
    ],
  },
  {
    id: "climate-zones",
    topicTitle: "Restoring biomes vs building new industrial zones",
    debatedAt: "2026-04-12T15:00:00.000Z",
    outcome: "effort",
    headline: "SOLID EFFORT",
    subline: "Evidence landed; tighten your opening structure next time.",
    level: 41,
    xpCurrent: 2000,
    xpToNext: 3000,
    xpEarned: 180,
    feedback:
      "You cited strong sources on restoration timelines, but the rebuttal on economic trade-offs arrived late. Front-load your strongest data when the phase clock is tight.",
    quote: "Every biome tells a story—make sure the jury hears yours in the first minute.",
    scores: { clarity: 7.2, evidence: 8.1 },
    suggestedTomes: tomePair(
      {
        title: "Ecology & Argument",
        subtitle: "Green Rhetoric",
        kind: "rare",
        label: "+3 Wis",
        accent: "primary",
        icon: "menu_book",
      },
      {
        title: "Counter-Examples II",
        subtitle: "Steel Man Practice",
        kind: "enchanted",
        label: "+4 Lvl",
        accent: "tertiary",
        icon: "psychology",
      },
    ),
    loot: [{ label: "120 Gold Ingots", tone: "gold" }],
    transcript: [
      {
        speaker: "System",
        text: "Debate opened: Restoring biomes vs building new industrial zones.",
        at: "2026-04-12T15:00:00.000Z",
      },
      {
        speaker: "You",
        text: "Restoration reduces long-run disaster costs and stabilizes food chains.",
        at: "2026-04-12T15:01:11.000Z",
      },
      {
        speaker: "Opponent",
        text: "Industrial expansion provides immediate jobs and supply resilience.",
        at: "2026-04-12T15:02:30.000Z",
      },
      {
        speaker: "System",
        text: "Round ended. Decision: tie-level effort; improve opening structure.",
        at: "2026-04-12T15:09:42.000Z",
      },
    ],
  },
  {
    id: "video-games",
    topicTitle: "Does gaming improve architectural thinking or just burn time?",
    debatedAt: "2026-04-05T18:45:00.000Z",
    outcome: "victory",
    headline: "CRAFTED WIN",
    subline: "Analogies to spatial reasoning carried the round.",
    level: 40,
    xpCurrent: 1820,
    xpToNext: 2800,
    xpEarned: 320,
    feedback:
      "Linking voxel design habits to real planning was memorable. Opponent struggled to answer your meta-level framing without conceding transferable skills.",
    quote: "Play is rehearsal—your blocks were blueprints in disguise.",
    scores: { clarity: 8.4, evidence: 7.9 },
    suggestedTomes: tomePair(
      {
        title: "Metaphor Mastery",
        subtitle: "Analogies that stick",
        kind: "enchanted",
        label: "+6 Cha",
        accent: "tertiary",
        icon: "psychology",
      },
      {
        title: "Time & Value I",
        subtitle: "Opportunity cost drills",
        kind: "rare",
        label: "+2 Int",
        accent: "primary",
        icon: "menu_book",
      },
    ),
    loot: [
      { label: "280 Gold Ingots", tone: "gold" },
      { label: "Redstone Debater Cloak", tone: "emerald" },
    ],
    transcript: [
      {
        speaker: "System",
        text: "Debate opened: Does gaming improve architectural thinking or just burn time?",
        at: "2026-04-05T18:45:00.000Z",
      },
      {
        speaker: "You",
        text: "Games train spatial planning, iteration, and rapid feedback loops.",
        at: "2026-04-05T18:46:13.000Z",
      },
      {
        speaker: "Opponent",
        text: "Most gameplay habits do not transfer to disciplined project delivery.",
        at: "2026-04-05T18:47:28.000Z",
      },
      {
        speaker: "System",
        text: "Round ended. Your examples and framing won the vote.",
        at: "2026-04-05T18:53:16.000Z",
      },
    ],
  },
  {
    id: "pets-companion",
    topicTitle: "Cats vs Dogs: The eternal struggle for the best pet",
    debatedAt: "2026-03-22T12:10:00.000Z",
    outcome: "victory",
    headline: "FLAWLESS REASONING",
    subline: "Humor plus data—a dangerous combo.",
    level: 39,
    xpCurrent: 1500,
    xpToNext: 2800,
    xpEarned: 410,
    feedback:
      "You balanced emotional appeal with welfare statistics without slipping into ad hominem. Closing synthesis tied loyalty metrics back to the resolution cleanly.",
    quote: "The best companion argument is the one that respects both paws.",
    scores: { clarity: 9.1, evidence: 8.5 },
    suggestedTomes: tomePair(
      {
        title: "Pathos Without Fallacy",
        subtitle: "Emotional range",
        kind: "rare",
        label: "+5 Emp",
        accent: "primary",
        icon: "psychology",
      },
      {
        title: "Closing Lines V",
        subtitle: "Last-word craft",
        kind: "enchanted",
        label: "+7 Lvl",
        accent: "tertiary",
        icon: "menu_book",
      },
    ),
    loot: [{ label: "350 Gold Ingots", tone: "gold" }],
    transcript: [
      {
        speaker: "System",
        text: "Debate opened: Cats vs Dogs: The eternal struggle for the best pet.",
        at: "2026-03-22T12:10:00.000Z",
      },
      {
        speaker: "Opponent",
        text: "Dogs provide stronger measurable social and safety utility.",
        at: "2026-03-22T12:11:22.000Z",
      },
      {
        speaker: "You",
        text: "Companionship quality depends on household fit, welfare, and owner commitment.",
        at: "2026-03-22T12:12:05.000Z",
      },
      {
        speaker: "System",
        text: "Round ended. Your balance of empathy and data secured victory.",
        at: "2026-03-22T12:18:07.000Z",
      },
    ],
  },
];

/** @deprecated Prefer getDebateHistory / getDebateResultById */
export const mockDebateResult: DebateResult = mockDebateHistory[0];
