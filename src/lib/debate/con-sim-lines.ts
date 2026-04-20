/** Simulated Con messages when the user plays Pro (demo opponent). */

const CROSS_EX: string[] = [
  "Cross-ex: What is your bright-line test for when your benefit actually occurs?",
  "Question — on your evidence, how large is the effect size versus status quo?",
  "If your main claim fails, what is the next-best reason we should still affirm?",
  "Walk me through the chain: your principle → your outcome in one concrete case.",
  "Under your framework, who bears the burden if costs show up before benefits?",
  "Is your criterion reversible — could the same logic support the opposite side?",
];

const CONSTRUCTIVE: string[] = [
  "I negate: the harms and trade-offs you brushed past outweigh the story you told.",
  "Here are two independent reasons to reject the resolution — scope and enforcement.",
  "Even granting your best case, the countervailing risks make your plan a bad bet.",
  "The resolution over-promises: real institutions move slower than your model assumes.",
  "I will show structural incentives that cut against your claimed benefits.",
];

const CON_OTHER: string[] = [
  "Con continues: tying this back to the core clash on impacts versus values.",
  "From the Con side: your last point does not resolve the incentive problem I raised.",
  "Con: even if sympathetic, your line still loses on comparative outcomes.",
];

export function pickConSimLine(phaseIndex: number): string {
  const pools =
    phaseIndex === 1
      ? CROSS_EX
      : phaseIndex === 2
        ? CONSTRUCTIVE
        : CON_OTHER;
  const i = Math.floor(Math.random() * pools.length);
  return pools[i] ?? pools[0];
}
