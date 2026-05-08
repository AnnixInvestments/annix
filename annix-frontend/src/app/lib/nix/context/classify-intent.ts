import type { NixCapability } from "@/app/lib/query/hooks";

/**
 * Frontend intent classifier for snappier UX. The backend's
 * NixCapabilityRegistry.findByIntent is the authoritative routing layer —
 * use this only to pre-classify what the user is typing so the chat panel
 * can show a "Did you mean: <capability>?" hint while the message is still
 * in the input.
 *
 * Naive substring match against each capability's intents (case-insensitive).
 * Mirrors the backend implementation so frontend pre-classification cannot
 * drift from server-side routing behaviour.
 */
export function classifyIntent(
  message: string,
  capabilities: readonly NixCapability[],
): NixCapability[] {
  const needle = message.toLowerCase().trim();
  if (!needle) return [];
  return capabilities.filter((capability) => {
    const intents = capability.intents;
    if (!intents) return false;
    return intents.some((intent) => needle.includes(intent.toLowerCase()));
  });
}

/**
 * Returns the single best-ranked capability for a phrase, or null. Phase 5
 * cross-app routing extends this with current-app-context preference and
 * RBAC filtering; Phase 2's frontend pre-classifier simply takes the first
 * match in registration order.
 */
export function bestIntent(
  message: string,
  capabilities: readonly NixCapability[],
): NixCapability | null {
  const matches = classifyIntent(message, capabilities);
  const first = matches[0];
  return first ?? null;
}
