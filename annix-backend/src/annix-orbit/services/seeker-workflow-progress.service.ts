import { Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { SeekerTestParticipant } from "../entities/seeker-test-participant.entity";
import { SeekerWorkflowProgress } from "../entities/seeker-workflow-progress.entity";
import { SEEKER_EVENT_TO_STEP, SEEKER_WORKFLOW_STEPS } from "../lib/seeker-testing.constants";
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

@Injectable()
export class SeekerWorkflowProgressService {
  private readonly logger = new Logger(SeekerWorkflowProgressService.name);

  constructor(
    private readonly events: SeekerTestEventRepository,
    private readonly phases: SeekerTestPhaseRepository,
    private readonly participants: SeekerTestParticipantRepository,
    private readonly progress: SeekerWorkflowProgressRepository,
    private readonly steps: SeekerWorkflowStepRepository,
    private readonly candidates: CandidateRepository,
  ) {}

  private async registeredAtForCandidate(candidateId: number): Promise<Date | null> {
    try {
      const candidate = await this.candidates.findById(candidateId);
      const createdAt = candidate ? candidate.createdAt : null;
      return createdAt ? new Date(createdAt) : null;
    } catch {
      return null;
    }
  }

  private async activePhaseId(): Promise<string | null> {
    const active = await this.phases.findByStatus("active");
    if (active.length > 0) {
      return String(active[0].id);
    }
    const all = await this.phases.listNewestFirst();
    return all.length > 0 ? String(all[0].id) : null;
  }

  async reconcile(): Promise<{ participants: number; events: number }> {
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
    candidateEvents: { eventName: string; ts: Date }[],
  ): Promise<void> {
    const participant = await this.ensureParticipant(candidateId, phaseId);
    const participantId = String(participant.id);

    const firstTsByStep = candidateEvents.reduce<Map<string, Date>>((acc, event) => {
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

    // Every tracked candidate is, by definition, registered — derive the
    // registered_account step + registeredAt from the candidate's creation time.
    const registeredAt = await this.registeredAtForCandidate(candidateId);
    if (registeredAt && !firstTsByStep.has("registered_account")) {
      firstTsByStep.set("registered_account", registeredAt);
    }

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
    await this.steps.create({ participantId, stepKey, completed: true, completedAt });
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

    const existing = await this.progress.findByParticipant(participantId);
    if (existing) {
      existing.registeredAt = registeredAt;
      existing.cvUploadedAt = cvUploadedAt;
      existing.careerScoreGeneratedAt = careerScoreGeneratedAt;
      existing.firstJobsViewedAt = firstJobsViewedAt;
      existing.timeToFirstValueSeconds = ttfv;
      existing.completedSteps = completedSteps;
      existing.lastActiveAt = lastActiveAt;
      await this.progress.save(existing);
      return;
    }
    await this.progress.create({
      participantId,
      candidateId,
      registeredAt,
      cvUploadedAt,
      careerScoreGeneratedAt,
      firstJobsViewedAt,
      timeToFirstValueSeconds: ttfv,
      completedSteps,
      lastActiveAt,
    });
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
