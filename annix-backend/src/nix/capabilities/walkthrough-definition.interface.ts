/**
 * Walkthrough definition for INixCapability.
 *
 * Phase 1 establishes the shape; Phase 4 builds the engine that consumes it.
 * Steps are sourced from how-to guides at runtime via NixGuideLoader, but a
 * capability MAY supply an inline static step list when no guide exists yet.
 */

export type WalkthroughStepKind = "instruction" | "input" | "navigation" | "wait-for-event";

export interface WalkthroughStep {
  readonly kind: WalkthroughStepKind;
  readonly title: string;
  readonly body: string;
  readonly route?: string;
  readonly expectedEvent?: string;
}

export interface IWalkthroughDefinition {
  readonly key: string;
  readonly label: string;
  readonly entryRoute?: string;
  readonly steps?: readonly WalkthroughStep[];
  readonly guideSlug?: string;
}
