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
import { fromISO, now } from "../../lib/datetime";
import {
  CreateSeekerTestingIssueDto,
  CreateSeekerTestPhaseDto,
  UpdateSeekerTestingIssueDto,
  UpdateSeekerTestPhaseDto,
} from "../dto/seeker-testing.dto";
import { SeekerTestParticipantRepository } from "../repositories/seeker-test-participant.repository";
import { SeekerTestPhaseRepository } from "../repositories/seeker-test-phase.repository";
import { SeekerTestingIssueRepository } from "../repositories/seeker-testing-issue.repository";
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
  ) {}

  @Get("phases")
  phasesList() {
    return this.phases.listNewestFirst();
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

  @Get("users")
  users() {
    return this.progress.listProgress();
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
  issuesList() {
    return this.issues.listNewestFirst();
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
