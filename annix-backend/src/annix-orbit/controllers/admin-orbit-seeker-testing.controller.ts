import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { CustomerFeedback } from "../../feedback/entities/customer-feedback.entity";
import { FeedbackService } from "../../feedback/feedback.service";
import { fromISO, now } from "../../lib/datetime";
import {
  CreateSeekerTestingIssueDto,
  CreateSeekerTestPhaseDto,
  UpdateSeekerTestingIssueDto,
  UpdateSeekerTestPhaseDto,
} from "../dto/seeker-testing.dto";
import { Candidate } from "../entities/candidate.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { SeekerTestParticipantRepository } from "../repositories/seeker-test-participant.repository";
import { SeekerTestPhaseRepository } from "../repositories/seeker-test-phase.repository";
import { SeekerTestingIssueRepository } from "../repositories/seeker-testing-issue.repository";
import { AdminOrbitUserService } from "../services/admin-orbit-user.service";
import { SeekerLaunchReadinessService } from "../services/seeker-launch-readiness.service";
import { SeekerTelemetryService } from "../services/seeker-telemetry.service";
import { SeekerWorkflowProgressService } from "../services/seeker-workflow-progress.service";

@Controller("admin/annix-orbit/seeker-testing")
@UseGuards(AdminAuthGuard)
export class AdminOrbitSeekerTestingController {
  constructor(
    private readonly phases: SeekerTestPhaseRepository,
    private readonly participants: SeekerTestParticipantRepository,
    private readonly issues: SeekerTestingIssueRepository,
    private readonly progress: SeekerWorkflowProgressService,
    private readonly telemetry: SeekerTelemetryService,
    private readonly readiness: SeekerLaunchReadinessService,
    private readonly feedback: FeedbackService,
    private readonly userService: AdminOrbitUserService,
    private readonly candidateRepo: CandidateRepository,
  ) {}

  private static readonly ORBIT_FEEDBACK_CONTEXT = "annix-orbit";

  @Get("phases")
  async phasesList() {
    const phases = await this.phases.listNewestFirst();
    const registeredProspects = (await this.userService.seekerProspects()).filter(
      (prospect) => !prospect.hasCandidate && prospect.hasLoggedIn,
    ).length;
    return Promise.all(
      phases.map(async (phase) => {
        const participantCount = await this.participants.countByPhase(String(phase.id));
        phase.actualUsers =
          phase.status === "active" ? participantCount + registeredProspects : participantCount;
        return phase;
      }),
    );
  }

  @Post("phases")
  createPhase(@Body() dto: CreateSeekerTestPhaseDto) {
    return this.phases.create({
      name: dto.name,
      targetUsers: dto.targetUsers ?? 0,
      startDate: dto.startDate ? fromISO(dto.startDate).toJSDate() : null,
      endDate: dto.endDate ? fromISO(dto.endDate).toJSDate() : null,
      notes: dto.notes ?? null,
      status: "pending",
      actualUsers: 0,
      readinessPercentage: 0,
    });
  }

  @Patch("phases/:id")
  async updatePhase(@Param("id") id: string, @Body() dto: UpdateSeekerTestPhaseDto) {
    const phase = await this.phases.findById(id);
    if (!phase) {
      throw new NotFoundException("Phase not found");
    }
    if (dto.status !== undefined) phase.status = dto.status;
    if (dto.startDate !== undefined)
      phase.startDate = dto.startDate ? fromISO(dto.startDate).toJSDate() : null;
    if (dto.endDate !== undefined)
      phase.endDate = dto.endDate ? fromISO(dto.endDate).toJSDate() : null;
    if (dto.targetUsers !== undefined) phase.targetUsers = dto.targetUsers;
    if (dto.actualUsers !== undefined) phase.actualUsers = dto.actualUsers;
    if (dto.notes !== undefined) phase.notes = dto.notes;
    if (dto.readinessPercentage !== undefined) phase.readinessPercentage = dto.readinessPercentage;
    return this.phases.save(phase);
  }

  @Get("overview")
  async overview() {
    const readiness = await this.readiness.compute();
    const funnel = await this.progress.funnel();
    return { readiness, funnel };
  }

  @Get("errors-latency")
  async errorsLatency() {
    const recentFailures = await this.telemetry.recentFailures(50);
    const latency = await this.telemetry.latencyStats();
    const errorRate = await this.telemetry.errorRatePct();
    return { recentFailures, latency, errorRate };
  }

  private candidateLabel(candidate: Candidate | null): string | null {
    if (!candidate) {
      return null;
    }
    if (candidate.name && candidate.email) {
      return `${candidate.name} (${candidate.email})`;
    }
    if (candidate.name) {
      return candidate.name;
    }
    return candidate.email;
  }

  @Get("users")
  async users() {
    const rows = await this.progress.listProgress();
    const candidateIds = [...new Set(rows.map((row) => row.candidateId))];
    const candidates = await this.candidateRepo.findByIds(candidateIds);
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const progressRows = rows.map((row) => ({
      ...row,
      label: this.candidateLabel(candidateById.get(row.candidateId) ?? null),
    }));
    const prospects = (await this.userService.seekerProspects()).filter(
      (prospect) => !prospect.hasCandidate,
    );
    const prospectRows = prospects.map((prospect) => ({
      id: `prospect-${prospect.userId}`,
      participantId: null,
      candidateId: null,
      label: prospect.name ? `${prospect.name} (${prospect.email})` : prospect.email,
      registeredAt: prospect.hasLoggedIn ? prospect.lastLoginAt : null,
      cvUploadedAt: null,
      careerScoreGeneratedAt: null,
      firstJobsViewedAt: null,
      timeToFirstValueSeconds: null,
      completedSteps: prospect.hasLoggedIn ? 1 : 0,
      lastActiveAt: prospect.lastLoginAt,
      status: prospect.hasLoggedIn ? "registered" : "invited",
    }));
    return [...progressRows, ...prospectRows];
  }

  @Get("readiness")
  async readinessReport() {
    const current = await this.readiness.compute();
    const history = await this.readiness.history(30);
    return { current, history };
  }

  @Post("recalculate")
  recalculate() {
    return this.readiness.snapshot();
  }

  @Get("issues")
  async issuesList() {
    const manual = await this.issues.listNewestFirst();
    const manualMapped = manual.map((issue) => ({
      id: issue.id,
      source: "manual" as const,
      userId: issue.userId,
      phaseId: issue.phaseId,
      page: issue.page,
      workflowStep: issue.workflowStep,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      screenshotUrl: issue.screenshotUrl,
      status: issue.status,
      submitterEmail: null as string | null,
      createdAt: issue.createdAt,
    }));
    const feedback = await this.feedback
      .listForAppContext(AdminOrbitSeekerTestingController.ORBIT_FEEDBACK_CONTEXT)
      .catch(() => []);
    const feedbackMapped = feedback.map((item) => this.feedbackToIssue(item));
    return [...manualMapped, ...feedbackMapped].sort((a, b) => {
      const at = a.createdAt ? a.createdAt.getTime() : 0;
      const bt = b.createdAt ? b.createdAt.getTime() : 0;
      return bt - at;
    });
  }

  private feedbackToIssue(item: CustomerFeedback) {
    const content = item.content ?? "";
    const trimmed = content.trim();
    const title = trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed || "Feedback";
    const override = item.testingSeverityOverride;
    const assessed = item.severity;
    return {
      id: `fb-${item.id}`,
      source: "feedback" as const,
      userId: null as number | null,
      phaseId: null as string | null,
      page: item.pageUrl ?? null,
      workflowStep: null as string | null,
      severity: override || assessed || "medium",
      title,
      description: content,
      screenshotUrl: null as string | null,
      status: item.testingStatusOverride || (item.status === "resolved" ? "resolved" : "open"),
      submitterEmail: item.submitterEmail ?? null,
      createdAt: item.createdAt,
    };
  }

  @Post("issues")
  createIssue(@Body() dto: CreateSeekerTestingIssueDto) {
    return this.issues.create({
      title: dto.title,
      description: dto.description,
      severity: dto.severity ?? "medium",
      page: dto.page ?? null,
      workflowStep: dto.workflowStep ?? null,
      userId: dto.userId ?? null,
      phaseId: dto.phaseId ?? null,
      screenshotUrl: dto.screenshotUrl ?? null,
      status: "open",
    });
  }

  @Patch("issues/:id")
  async updateIssue(@Param("id") id: string, @Body() dto: UpdateSeekerTestingIssueDto) {
    if (id.startsWith("fb-")) {
      const feedbackId = Number.parseInt(id.slice(3), 10);
      if (!Number.isInteger(feedbackId)) {
        throw new NotFoundException("Issue not found");
      }
      if (dto.severity !== undefined) {
        const updated = await this.feedback.setTestingSeverity(feedbackId, dto.severity);
        if (!updated) {
          throw new NotFoundException("Issue not found");
        }
      }
      if (dto.status !== undefined) {
        const updated = await this.feedback.setTestingStatus(feedbackId, dto.status);
        if (!updated) {
          throw new NotFoundException("Issue not found");
        }
      }
      return { id, severity: dto.severity, status: dto.status };
    }
    const issue = await this.issues.findById(id);
    if (!issue) {
      throw new NotFoundException("Issue not found");
    }
    if (dto.severity !== undefined) issue.severity = dto.severity;
    if (dto.status !== undefined) {
      issue.status = dto.status;
      issue.resolvedAt =
        dto.status === "resolved" || dto.status === "ignored" ? now().toJSDate() : null;
    }
    return this.issues.save(issue);
  }
}
