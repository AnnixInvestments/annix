import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { fromISO, now, nowISO } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import {
  NixChatSession,
  type NixSessionOwner,
  type WalkthroughEndReason,
  type WalkthroughState,
} from "../entities/nix-chat-session.entity";
import { NixChatSessionRepository } from "../nix-chat-session.repository";
import { NixCapabilityRegistry } from "./nix-capability-registry.service";
import { NixGuideLoader, type ParsedGuide } from "./nix-guide-loader.service";

/**
 * WalkthroughEngine — drives Nix's step-by-step guidance mode.
 *
 * State lives on `nix_chat_sessions.walkthrough_state` (jsonb). The engine
 * exposes a small lifecycle: start → advance/back/skip(N times) → stop or
 * auto-complete when the last step is past.
 *
 * Step source resolution (priority order):
 *   1. capability.walkthrough.steps[]  — capability supplies its own list
 *   2. NixGuideLoader.load(appCode, capability.guideSlug).headings (H2 only)
 *   3. capability.walkthrough.guideSlug (alternate slug pointer)
 *
 * If neither yields a usable step list the engine refuses to start.
 *
 * Phase 4 of issue #262.
 */
export interface WalkthroughStepView {
  readonly step: number;
  readonly totalSteps: number;
  readonly title: string;
  readonly body: string;
  readonly isLast: boolean;
  readonly capabilityLabel: string;
}

@Injectable()
export class WalkthroughEngine {
  private readonly logger = new Logger(WalkthroughEngine.name);

  constructor(
    private readonly sessionRepo: NixChatSessionRepository,
    private readonly registry: NixCapabilityRegistry,
    private readonly guideLoader: NixGuideLoader,
    @Optional()
    @Inject(ExtractionMetricService)
    private readonly metricService: ExtractionMetricService | null = null,
  ) {}

  async start(
    sessionId: number,
    owner: NixSessionOwner,
    capabilityKey: string,
  ): Promise<WalkthroughStepView> {
    const session = await this.ownedSession(sessionId, owner);
    const capability = this.registry.capability(capabilityKey);
    if (!capability) {
      throw new NotFoundException(`Unknown capability: ${capabilityKey}`);
    }

    const steps = this.resolveSteps(capability.appCode, capability);
    if (steps.length === 0) {
      throw new NotFoundException(
        `Capability "${capabilityKey}" has no walkthrough steps (neither inline nor a resolvable guide).`,
      );
    }

    const state: WalkthroughState = {
      capabilityKey,
      guideSlug: capability.guideSlug ?? null,
      startedAt: nowISO(),
      currentStep: 0,
      totalSteps: steps.length,
      stepHistory: [],
    };
    session.walkthroughState = state;
    await this.sessionRepo.save(session);

    this.logger.log(
      `Walkthrough started: session=${sessionId} capability=${capabilityKey} totalSteps=${steps.length}`,
    );
    return this.viewForStep(steps, capability.label, 0);
  }

  async advance(sessionId: number, owner: NixSessionOwner): Promise<WalkthroughStepView | null> {
    return this.move(sessionId, owner, 1, "advanced");
  }

  async back(sessionId: number, owner: NixSessionOwner): Promise<WalkthroughStepView | null> {
    return this.move(sessionId, owner, -1, "back");
  }

  async skip(sessionId: number, owner: NixSessionOwner): Promise<WalkthroughStepView | null> {
    return this.move(sessionId, owner, 1, "skipped");
  }

  async stop(
    sessionId: number,
    owner: NixSessionOwner,
    reason: WalkthroughEndReason = "stopped",
  ): Promise<void> {
    const session = await this.ownedSession(sessionId, owner);
    const state = session.walkthroughState;
    if (!state || state.endedAt) return;

    state.endedAt = nowISO();
    state.endReason = reason;
    session.walkthroughState = state;
    await this.sessionRepo.save(session);
    this.logger.log(`Walkthrough ${reason}: session=${sessionId}`);
    await this.recordTelemetry(state, reason);
  }

  // Counter-style telemetry on the existing extraction-metric
  // infrastructure (no new collection): one row per finished
  // walkthrough, keyed nix-walkthrough/<endReason>, durationMs =
  // wall time from start to stop. Stats surface via
  // GET /metrics/extraction-stats?category=nix-walkthrough.
  private async recordTelemetry(state: WalkthroughState, reason: WalkthroughEndReason) {
    if (!this.metricService) return;
    const startedAt = fromISO(state.startedAt);
    const durationMs = Math.max(0, now().toMillis() - startedAt.toMillis());
    await this.metricService.record({
      category: "nix-walkthrough",
      operation: reason,
      durationMs,
      succeeded: reason === "completed",
    });
  }

  async state(sessionId: number, owner: NixSessionOwner): Promise<WalkthroughState | null> {
    const session = await this.ownedSession(sessionId, owner);
    return session.walkthroughState;
  }

  async currentStepView(
    sessionId: number,
    owner: NixSessionOwner,
  ): Promise<WalkthroughStepView | null> {
    const session = await this.ownedSession(sessionId, owner);
    const state = session.walkthroughState;
    if (!state || state.endedAt) return null;
    const capability = this.registry.capability(state.capabilityKey);
    if (!capability) return null;
    const steps = this.resolveSteps(capability.appCode, capability);
    if (steps.length === 0) return null;
    return this.viewForStep(steps, capability.label, state.currentStep);
  }

  /**
   * Engaged when the user replies "stuck" — returns the current step view
   * plus the full guide body so the caller (chat panel) can hand both to
   * the AI for a context-grounded answer.
   */
  async stuckContext(
    sessionId: number,
    owner: NixSessionOwner,
  ): Promise<{ step: WalkthroughStepView; guide: ParsedGuide | null } | null> {
    const session = await this.ownedSession(sessionId, owner);
    const state = session.walkthroughState;
    if (!state || state.endedAt) return null;
    const capability = this.registry.capability(state.capabilityKey);
    if (!capability) return null;
    const steps = this.resolveSteps(capability.appCode, capability);
    if (steps.length === 0) return null;

    const stepView = this.viewForStep(steps, capability.label, state.currentStep);
    const guide = state.guideSlug
      ? this.guideLoader.load(capability.appCode, state.guideSlug)
      : null;

    state.stepHistory = [
      ...state.stepHistory,
      {
        step: state.currentStep,
        title: stepView.title,
        completedAt: nowISO(),
        action: "stuck",
      },
    ];
    session.walkthroughState = state;
    await this.sessionRepo.save(session);

    return { step: stepView, guide };
  }

  private async move(
    sessionId: number,
    owner: NixSessionOwner,
    delta: number,
    action: "advanced" | "back" | "skipped",
  ): Promise<WalkthroughStepView | null> {
    const session = await this.ownedSession(sessionId, owner);
    const state = session.walkthroughState;
    if (!state || state.endedAt) {
      throw new NotFoundException(`No active walkthrough on session ${sessionId}`);
    }
    const capability = this.registry.capability(state.capabilityKey);
    if (!capability) {
      throw new NotFoundException(`Capability gone mid-walkthrough: ${state.capabilityKey}`);
    }
    const steps = this.resolveSteps(capability.appCode, capability);
    if (steps.length === 0) {
      throw new NotFoundException("Walkthrough step source is empty");
    }

    const currentTitle = steps[state.currentStep]?.title ?? "(unknown)";
    state.stepHistory = [
      ...state.stepHistory,
      { step: state.currentStep, title: currentTitle, completedAt: nowISO(), action },
    ];

    const nextStep = state.currentStep + delta;
    if (nextStep < 0) {
      state.currentStep = 0;
      session.walkthroughState = state;
      await this.sessionRepo.save(session);
      return this.viewForStep(steps, capability.label, 0);
    }
    if (nextStep >= steps.length) {
      state.endedAt = nowISO();
      state.endReason = "completed";
      state.currentStep = steps.length;
      session.walkthroughState = state;
      await this.sessionRepo.save(session);
      this.logger.log(`Walkthrough completed: session=${sessionId}`);
      return null;
    }

    state.currentStep = nextStep;
    session.walkthroughState = state;
    await this.sessionRepo.save(session);
    return this.viewForStep(steps, capability.label, nextStep);
  }

  private resolveSteps(
    appCode: string,
    capability: {
      walkthrough?: { steps?: readonly { title: string; body: string }[]; guideSlug?: string };
      guideSlug?: string;
    },
  ): { title: string; body: string }[] {
    const inlineSteps = capability.walkthrough?.steps;
    if (inlineSteps && inlineSteps.length > 0) {
      return inlineSteps.map((s) => ({ title: s.title, body: s.body }));
    }
    const slug = capability.walkthrough?.guideSlug ?? capability.guideSlug;
    if (!slug) return [];
    const guide = this.guideLoader.load(appCode, slug);
    if (!guide) return [];
    const h2Headings = guide.headings.filter((h) => h.level === 2);
    if (h2Headings.length === 0) return [];
    return this.partitionGuideByH2(guide, h2Headings);
  }

  private partitionGuideByH2(
    guide: ParsedGuide,
    h2Headings: readonly { level: number; text: string }[],
  ): { title: string; body: string }[] {
    const lines = guide.body.split(/\r?\n/);
    const partitions: { title: string; body: string[] }[] = [];
    let current: { title: string; body: string[] } | null = null;
    for (const line of lines) {
      const headingMatch = line.match(/^##\s+(.+?)\s*$/);
      const isH2 = headingMatch !== null && !line.startsWith("###");
      if (isH2 && headingMatch) {
        if (current) partitions.push(current);
        current = { title: headingMatch[1], body: [] };
      } else if (current) {
        current.body.push(line);
      }
    }
    if (current) partitions.push(current);
    return partitions
      .filter((p) => h2Headings.some((h) => h.text === p.title))
      .map((p) => ({ title: p.title, body: p.body.join("\n").trim() }));
  }

  private viewForStep(
    steps: { title: string; body: string }[],
    capabilityLabel: string,
    stepIdx: number,
  ): WalkthroughStepView {
    const step = steps[stepIdx];
    return {
      step: stepIdx + 1,
      totalSteps: steps.length,
      title: step.title,
      body: step.body,
      isLast: stepIdx === steps.length - 1,
      capabilityLabel,
    };
  }

  private async ownedSession(sessionId: number, owner: NixSessionOwner): Promise<NixChatSession> {
    const session = await this.sessionRepo.findOwnedById(sessionId, owner);
    if (!session) {
      const exists = await this.sessionRepo.findById(sessionId);
      if (exists) {
        throw new ForbiddenException("You do not have access to this chat session");
      }
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return session;
  }
}
