import { Injectable, Logger } from "@nestjs/common";
import type { INixCapability } from "./nix-capability.interface";

/**
 * NixCapabilityRegistry — the umbrella registry for cross-app Nix capabilities.
 *
 * Mirrors the shape of NixExtractionProfileRegistry (which only registers
 * extraction-specific handlers). Each app module registers its capabilities
 * on bootstrap via OnModuleInit:
 *
 *   constructor(private readonly registry: NixCapabilityRegistry) {}
 *   onModuleInit(): void {
 *     this.registry.register({
 *       key: "rfq.extract-boq",
 *       appCode: "rfq",
 *       label: "Extract BOQ from document",
 *       description: "...",
 *       intents: ["extract boq", "upload boq", "read boq"],
 *       extractionProfile: this.rfqPipingProfileHandler,
 *     });
 *   }
 *
 * Phase 5 (cross-app intent routing) will read findByIntent() to pick the
 * right capability for a user message. Phase 4 (walkthrough engine) will
 * read findByGuideSlug() to start a guide-backed walkthrough.
 */
@Injectable()
export class NixCapabilityRegistry {
  private readonly logger = new Logger(NixCapabilityRegistry.name);
  private readonly capabilities = new Map<string, INixCapability>();

  register(capability: INixCapability): void {
    if (this.capabilities.has(capability.key)) {
      this.logger.warn(
        `Nix capability "${capability.key}" is being re-registered (replacing previous handler).`,
      );
    }
    this.capabilities.set(capability.key, capability);
    this.logger.log(
      `Registered Nix capability: ${capability.key} (app=${capability.appCode}, label="${capability.label}")`,
    );
  }

  capability(key: string): INixCapability | null {
    return this.capabilities.get(key) ?? null;
  }

  isRegistered(key: string): boolean {
    return this.capabilities.has(key);
  }

  all(): INixCapability[] {
    return Array.from(this.capabilities.values());
  }

  forApp(appCode: string): INixCapability[] {
    return this.all().filter((c) => c.appCode === appCode);
  }

  /**
   * Find capabilities matching a user phrase. Naive substring match against
   * each capability's intents; Phase 5 will replace this with a smarter
   * ranker that considers current app context, user app-access, and recency.
   */
  findByIntent(phrase: string): INixCapability[] {
    const needle = phrase.toLowerCase().trim();
    if (!needle) return [];
    return this.all().filter((c) => {
      const intents = c.intents;
      if (!intents) return false;
      return intents.some((intent) => needle.includes(intent.toLowerCase()));
    });
  }

  findByGuideSlug(slug: string): INixCapability | null {
    return this.all().find((c) => c.guideSlug === slug) ?? null;
  }

  registeredApps(): string[] {
    const apps = new Set<string>();
    for (const cap of this.all()) {
      apps.add(cap.appCode);
    }
    return Array.from(apps).sort();
  }

  /**
   * Detect a walkthrough trigger phrase and return the capability the user
   * wants walking through, if any. Recognises:
   *   "walk me through X" / "walkthrough X" / "step by step X"
   *   "guide me through X" / "guide me X"
   *   "help me with X" / "show me how to X"
   *
   * Strips the trigger prefix, then matches the remainder against capability
   * intents AND label substrings, but only across capabilities that have a
   * walkthrough sub-role (i.e. either inline steps or a guideSlug).
   *
   * Returns null if no trigger phrase is present or no matching capability
   * has a walkthrough available.
   */
  matchWalkthroughIntent(
    message: string,
  ): { capability: INixCapability; remainder: string } | null {
    const lowered = message.toLowerCase().trim();
    if (!lowered) return null;

    const triggers = [
      "walk me through",
      "walkthrough",
      "step by step",
      "step-by-step",
      "guide me through",
      "guide me",
      "show me how to",
      "show me how",
      "help me with",
      "hold my hand",
    ];
    const matchedTrigger = triggers.find((t) => lowered.includes(t));
    if (!matchedTrigger) return null;

    const remainder = lowered
      .slice(lowered.indexOf(matchedTrigger) + matchedTrigger.length)
      .trim()
      .replace(/^[:,—-]\s*/, "");
    if (!remainder) return null;

    const walkthroughCapable = this.all().filter(
      (c) => c.walkthrough !== undefined || c.guideSlug !== undefined,
    );

    const matchingByIntent = walkthroughCapable.find((c) => {
      const intents = c.intents;
      if (!intents) return false;
      return intents.some((intent) => remainder.includes(intent.toLowerCase()));
    });
    if (matchingByIntent) {
      return { capability: matchingByIntent, remainder };
    }

    const matchingByLabel = walkthroughCapable.find((c) =>
      remainder.includes(c.label.toLowerCase()),
    );
    if (matchingByLabel) {
      return { capability: matchingByLabel, remainder };
    }

    return null;
  }
}
