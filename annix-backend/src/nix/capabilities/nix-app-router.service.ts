import { Injectable } from "@nestjs/common";
import type { INixCapability } from "./nix-capability.interface";
import { NixCapabilityRegistry } from "./nix-capability-registry.service";

export interface AppRoutingContext {
  /** App the user is currently inside. */
  currentAppCode: string;
  /**
   * Apps the user may use, resolved by the CALLER from the live RBAC
   * tables (#259). The router never answers for an app outside this
   * list — that is the guard rail; this service does no access
   * resolution of its own.
   */
  accessibleAppCodes: readonly string[];
  /** Most-recently-used apps, newest first. Optional ranking signal. */
  recentAppCodes?: readonly string[];
}

export interface RoutedCapability {
  capability: INixCapability;
  /** True when the capability lives in an app other than the current one. */
  requiresAppSwitch: boolean;
}

/**
 * Phase 5 of issue #262 — cross-app intent routing.
 *
 * Given a user message and the user's app context, ranks every
 * intent-matching capability the user is ALLOWED to reach:
 *   1. current app first,
 *   2. then by recency of app use,
 *   3. then alphabetically (stable, predictable tail).
 *
 * The chat layer takes the head as the answer; any ranked entry with
 * requiresAppSwitch=true is the "I can help with that in <app> —
 * switch over?" hint.
 */
@Injectable()
export class NixAppRouterService {
  constructor(private readonly registry: NixCapabilityRegistry) {}

  route(message: string, context: AppRoutingContext): RoutedCapability[] {
    const accessible = new Set(context.accessibleAppCodes);
    const matches = this.registry
      .findByIntent(message)
      .filter((capability) => accessible.has(capability.appCode));

    return matches
      .slice()
      .sort(
        (a, b) =>
          this.appRank(a.appCode, context) - this.appRank(b.appCode, context) ||
          a.appCode.localeCompare(b.appCode) ||
          a.key.localeCompare(b.key),
      )
      .map((capability) => ({
        capability,
        requiresAppSwitch: capability.appCode !== context.currentAppCode,
      }));
  }

  best(message: string, context: AppRoutingContext): RoutedCapability | null {
    const ranked = this.route(message, context);
    const top = ranked[0];
    return top || null;
  }

  /**
   * Apps the router may talk about at all for this user — the
   * intersection of registered apps and the caller-resolved access
   * list. Useful for building the system-prompt capability digest
   * without leaking apps the user cannot reach.
   */
  appsInScope(context: AppRoutingContext): string[] {
    const accessible = new Set(context.accessibleAppCodes);
    return this.registry.registeredApps().filter((appCode) => accessible.has(appCode));
  }

  private appRank(appCode: string, context: AppRoutingContext): number {
    if (appCode === context.currentAppCode) return 0;
    const rawRecent = context.recentAppCodes;
    const recent = rawRecent || [];
    const recencyIndex = recent.indexOf(appCode);
    if (recencyIndex >= 0) return 1 + recencyIndex;
    return 1 + recent.length + 1;
  }
}
