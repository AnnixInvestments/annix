import type { IExtractionProfileHandler } from "../profiles/extraction-profile-handler.interface";
import type { IWalkthroughDefinition } from "./walkthrough-definition.interface";

/**
 * INixCapability is the umbrella interface every Annix app uses to declare
 * what Nix can do for users in that app's context. A capability may fulfil
 * one or more roles:
 *
 *   - extraction: parse a document into structured data (delegates to an
 *     existing IExtractionProfileHandler — no rewrite of those handlers)
 *   - chat: respond to user questions matching the declared intents
 *   - walkthrough: walk the user through a multi-step process, optionally
 *     sourced from a how-to guide
 *
 * Capabilities are registered into NixCapabilityRegistry on bootstrap (see
 * the existing RfqPipingProfileHandler for the OnModuleInit registration
 * pattern). Cross-app routing in Phase 5 reads from this registry.
 */

export interface PromptContext {
  readonly intent?: string;
  readonly currentRoute?: string;
  readonly recentMessages?: readonly { role: "user" | "assistant"; text: string }[];
}

export interface INixCapability {
  /** Globally unique key, e.g. "rfq.extract-boq" or "stock-control.create-job-card". */
  readonly key: string;

  /** Owning app (matches the front-end appCode used by NixAppProvider). */
  readonly appCode: string;

  /** Short human-readable label. Used in chat suggestions and the capability picker. */
  readonly label: string;

  /** One-sentence description of what this capability does for the user. */
  readonly description: string;

  /**
   * User phrases / keywords this capability should match. Used by chat-intent
   * routing to pick which capability handles a free-form user message.
   * Phase 5 cross-app routing ranks across all registered capabilities; the
   * existing extraction profile registry is unaware of intents.
   */
  readonly intents?: readonly string[];

  /**
   * Slug of a how-to guide under `annix-frontend/src/app/<appCode>/how-to/guides/`.
   * If set, NixGuideLoader can resolve the guide content for walkthrough mode.
   */
  readonly guideSlug?: string;

  /** Extraction sub-role — links to an existing IExtractionProfileHandler. */
  readonly extractionProfile?: IExtractionProfileHandler;

  /** Walkthrough sub-role — Phase 4 engine consumes this to drive step-by-step UX. */
  readonly walkthrough?: IWalkthroughDefinition;

  /**
   * Optional per-capability system prompt. Falls back to the global default
   * (DEFAULT_EXTRACTION_SYSTEM_PROMPT) when the capability does not override.
   * Mirrors the existing IExtractionProfileHandler.systemPrompt? signature so
   * a capability that wraps an extraction profile can re-use the same prompt.
   */
  systemPrompt?(ctx: PromptContext): string | undefined;
}
