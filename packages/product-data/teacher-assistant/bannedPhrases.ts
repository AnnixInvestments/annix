export const BANNED_PHRASES = [
  "research the topic",
  "use the internet",
  "research online",
  "explore this topic",
  "research and write",
  "find information about",
] as const;

export type BannedPhrase = (typeof BANNED_PHRASES)[number];

export function containsBannedPhrase(text: string): BannedPhrase | null {
  const lower = text.toLowerCase();
  const hit = BANNED_PHRASES.find((phrase) => lower.includes(phrase));
  return hit ?? null;
}
