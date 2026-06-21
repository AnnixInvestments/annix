import { Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { UserRepository } from "../../user/user.repository";
import { AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import { SeekerTestParticipant } from "../entities/seeker-test-participant.entity";
import { SeekerWorkflowProgress } from "../entities/seeker-workflow-progress.entity";
import { SEEKER_EVENT_TO_STEP, SEEKER_WORKFLOW_STEPS } from "../lib/seeker-testing.constants";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { SeekerTestEventRepository } from "../repositories/seeker-test-event.repository";
import { SeekerTestParticipantRepository } from "../repositories/seeker-test-participant.repository";
import { SeekerTestPhaseRepository } from "../repositories/seeker-test-phase.repository";
import { SeekerWorkflowProgressRepository } from "../repositories/seeker-workflow-progress.repository";
import { SeekerWorkflowStepRepository } from "../repositories/seeker-workflow-step.repository";

export interface FunnelRow {
  stepKey: string;
  count: number;
  pct: number;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

@Injectable()
export class SeekerWorkflowProgressService {
  private readonly logger = new Logger(SeekerWorkflowProgressService.name);
  private reconcileInFlight: Promise<{ participants: number; events: number }> | null = null;

  constructor(
    private readonly events: SeekerTestEventRepository,
    private readonly phases: SeekerTestPhaseRepository,
    private readonly participants: SeekerTestParticipantRepository,
    private readonly progress: SeekerWorkflowProgressRepository,
    private readonly steps: SeekerWorkflowStepRepository,
    private readonly candidates: CandidateRepository,
    private readonly profiles: AnnixOrbitProfileRepository,
    private readonly users: UserRepository,
  ) {}

  // Some steps fire telemetry before the seeker's Candidate row exists (the
  // Candidate is upserted later from extracted CV data), so those events carry a
  // null candidateId and reconcile drops them. Derive those steps from durable
  // profile state instead — the same approach used for registered_account.
  private async derivedSteps(candidateId: number): Promise<Map<string, Date>> {
    const derived = new Map<string, Date>();
    const candidate = await this.candidates.findById(candidateId).catch(() => null);
    if (candidate?.createdAt) {
      derived.set("registered_account", new Date(candidate.createdAt));
    }
    const email = candidate?.email ?? null;
    if (!email) {
      return derived;
    }
    const user = await this.users.findOrbitUserByEmail(email).catch(() => null);
    if (!user) {
      return derived;
    }
    const profile = await this.profiles.findByUserId(user.id).catch(() => null);
    if (!profile || profile.userType !== AnnixOrbitUserType.INDIVIDUAL) {
      return derived;
    }
    if (profile.onboardingCompletedAt) {
      derived.set("completed_profile", new Date(profile.onboardingCompletedAt));
    }
    if (profile.cvUploadedAt) {
      derived.set("uploaded_cv", new Date(profile.cvUploadedAt));
    }
    return derived;
  }

  private async activePhaseId(): Promise<string | null> {
    const active = await this.phases.findByStatus("active");
    if (active.length > 0) {
      return String(active[0].id);
    }
    const all = await this.phases.listNewestFirst();
    return all.length > 0 ? String(all[0].id) : null;
  }

  // Reconcile runs on every admin seeker-testing dashboard view (and the daily
  // cron). Overlapping views would otherwise race to create the same progress /
  // step rows and trip the unique indexes (E11000). Collapse concurrent callers
  // onto a single in-flight run.
  async reconcile(): Promise<{ participants: number; events: number }> {
    if (this.reconcileInFlight) {
      return this.reconcileInFlight;
    }
    this.reconcileInFlight = this.runReconcile().finally(() => {
      this.reconcileInFlight = null;
    });
    return this.reconcileInFlight;
  }

  private async runReconcile(): Promise<{ participants: number; events: number }> {
    const since = now().minus({ years: 5 }).toJSDate();
    const allEvents = await this.events.eventsSince(since);
    const phaseId = await this.activePhaseId();
    if (!phaseId) {
      return { participants: 0, events: allEvents.length };
    }

    const byCandidate = allEvents.reduce<Map<number, typeof allEvents>>((acc, event) => {
      if (typeof event.candidateId !== "number") {
        return acc;
      }
      const list = acc.get(event.candidateId) ?? [];
      list.push(event);
      acc.set(event.candidateId, list);
      return acc;
    }, new Map());

    await Array.from(byCandidate.entries()).reduce(async (prev, [candidateId, candidateEvents]) => {
      await prev;
      await this.reconcileCandidate(candidateId, phaseId, candidateEvents);
    }, Promise.resolve());

    return { participants: byCandidate.size, events: allEvents.length };
  }

  private async reconcileCandidate(
    candidateId: number,
    phaseId: string,
    candidateEvents: { eventName: string; ts: Date; ok?: boolean }[],
  ): Promise<void> {
    const participant = await this.ensureParticipant(candidateId, phaseId);
    const participantId = String(participant.id);

    const firstTsByStep = candidateEvents.reduce<Map<string, Date>>((acc, event) => {
      if (event.ok === false) {
        return acc;
      }
      const stepKey = SEEKER_EVENT_TO_STEP[event.eventName];
      if (!stepKey) {
        return acc;
      }
      const existing = acc.get(stepKey);
      if (!existing || event.ts < existing) {
        acc.set(stepKey, event.ts);
      }
      return acc;
    }, new Map());

    // Steps whose telemetry can fire before the Candidate row exists (registered,
    // completed_profile, uploaded_cv) are derived from durable state so they are
    // not lost to null-candidateId orphan events.
    const derived = await this.derivedSteps(candidateId);
    Array.from(derived.entries()).forEach(([stepKey, ts]) => {
      if (!firstTsByStep.has(stepKey)) {
        firstTsByStep.set(stepKey, ts);
      }
    });

    await Array.from(firstTsByStep.entries()).reduce(async (prev, [stepKey, ts]) => {
      await prev;
      await this.markStep(participantId, stepKey, ts);
    }, Promise.resolve());

    await this.updateProgress(participantId, candidateId, firstTsByStep, candidateEvents);
  }

  private async ensureParticipant(
    candidateId: number,
    phaseId: string,
  ): Promise<SeekerTestParticipant> {
    const inPhase = await this.participants.findByCandidateAndPhase(candidateId, phaseId);
    if (inPhase) {
      return inPhase;
    }
    // reconcile is the only creator of participants and assigns each candidate
    // to whatever phase is active at run time. A candidate must therefore have
    // at most one participant overall — when the active phase changes, migrate
    // their existing participant onto the new phase instead of creating a
    // second one, which would fan out into a duplicate workflow-progress row.
    const candidateParticipants = await this.participants.findByCandidate(candidateId);
    const incumbent = candidateParticipants.length > 0 ? candidateParticipants[0] : null;
    if (incumbent) {
      incumbent.phaseId = phaseId;
      return this.participants.save(incumbent);
    }
    return this.participants.create({
      candidateId,
      phaseId,
      role: "seeker",
      joinedAt: now().toJSDate(),
      status: "active",
    });
  }

  private async markStep(participantId: string, stepKey: string, completedAt: Date): Promise<void> {
    const existing = await this.steps.findByParticipantAndStep(participantId, stepKey);
    if (existing) {
      if (!existing.completed) {
        existing.completed = true;
        existing.completedAt = completedAt;
        await this.steps.save(existing);
      }
      return;
    }
    try {
      await this.steps.create({ participantId, stepKey, completed: true, completedAt });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      // A concurrent reconcile already created this step (already completed).
    }
  }

  private async updateProgress(
    participantId: string,
    candidateId: number,
    firstTsByStep: Map<string, Date>,
    candidateEvents: { ts: Date }[],
  ): Promise<void> {
    const registeredAt = firstTsByStep.get("registered_account") ?? null;
    const cvUploadedAt = firstTsByStep.get("uploaded_cv") ?? null;
    const careerScoreGeneratedAt = firstTsByStep.get("career_score_generated") ?? null;
    const firstJobsViewedAt = firstTsByStep.get("viewed_matched_jobs") ?? null;
    const ttfv =
      registeredAt && careerScoreGeneratedAt
        ? Math.max(
            0,
            Math.round((careerScoreGeneratedAt.getTime() - registeredAt.getTime()) / 1000),
          )
        : null;
    const lastActiveAt = candidateEvents.reduce<Date | null>((acc, event) => {
      if (!acc || event.ts > acc) {
        return event.ts;
      }
      return acc;
    }, null);
    const completedSteps = firstTsByStep.size;

    const fields = {
      registeredAt,
      cvUploadedAt,
      careerScoreGeneratedAt,
      firstJobsViewedAt,
      timeToFirstValueSeconds: ttfv,
      completedSteps,
      lastActiveAt,
    };

    const existing = await this.progress.findByParticipant(participantId);
    if (existing) {
      Object.assign(existing, fields);
      await this.progress.save(existing);
      return;
    }
    try {
      await this.progress.create({ participantId, candidateId, ...fields });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      // A concurrent reconcile created the row first; update it instead.
      const raced = await this.progress.findByParticipant(participantId);
      if (raced) {
        Object.assign(raced, fields);
        await this.progress.save(raced);
      }
    }
  }

  async stepCounts(): Promise<Map<string, number>> {
    const all = await this.progress.listAll();
    const counts = new Map<string, number>();
    await all.reduce(async (prev, progress) => {
      await prev;
      const steps = await this.steps.listByParticipant(progress.participantId);
      steps
        .filter((step) => step.completed)
        .forEach((step) => counts.set(step.stepKey, (counts.get(step.stepKey) ?? 0) + 1));
    }, Promise.resolve());
    return counts;
  }

  async funnel(): Promise<FunnelRow[]> {
    const counts = await this.stepCounts();
    const total = counts.get("registered_account") ?? 0;
    return SEEKER_WORKFLOW_STEPS.map((stepKey) => {
      const count = counts.get(stepKey) ?? 0;
      return { stepKey, count, pct: total === 0 ? 0 : Math.round((count / total) * 100) };
    });
  }

  listProgress(): Promise<SeekerWorkflowProgress[]> {
    return this.progress.listAll();
  }

  async avgTimeToFirstValueSeconds(): Promise<number | null> {
    const all = await this.progress.listAll();
    const values = all
      .map((p) => p.timeToFirstValueSeconds)
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) {
      return null;
    }
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }
}
