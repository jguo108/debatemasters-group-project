/** Resolution-style topics for arena matchmaking (random draw). */

const MATCH_TOPICS: string[] = [
  "This house believes schools should ban smartphones during the school day.",
  "This house believes voting should be compulsory in democratic elections.",
  "This house believes social media does more harm than good for teenagers.",
  "This house would prioritize climate action over short-term economic growth.",
  "This house believes artificial intelligence in classrooms helps learning more than it hurts it.",
  "This house would abolish standardized testing for university admissions.",
  "This house believes remote work should be the default for desk jobs.",
  "This house would legalize physician-assisted dying for terminally ill patients.",
  "This house believes professional athletes should be required to speak on political issues.",
  "This house would replace animal farming with large-scale plant-based food systems.",
  "This house believes space exploration should be funded primarily by governments, not private companies.",
  "This house would impose a universal basic income funded by wealth taxes.",
];

export function pickRandomMatchTopic(): string {
  const i = Math.floor(Math.random() * MATCH_TOPICS.length);
  return MATCH_TOPICS[i] ?? MATCH_TOPICS[0];
}
