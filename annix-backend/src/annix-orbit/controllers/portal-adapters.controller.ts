import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { JobPostingPortalStatus } from "../entities/job-posting-portal-posting.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { JobPostingRepository } from "../repositories/job-posting.repository";
import { JobPostingPortalPostingRepository } from "../repositories/job-posting-portal-posting.repository";
import { AssistedPostingInstructions, PortalAdapter } from "../services/portal-adapter.interface";
import { PortalAdapterRegistry } from "../services/portal-adapter-registry.service";

interface PortalAdapterSummary {
  code: string;
  displayName: string;
  costTier: string;
  postingMode: "feed" | "api" | "assisted";
  available: boolean;
}

interface AssistedPostingPackEntry extends AssistedPostingInstructions {
  portalCode: string;
  displayName: string;
}

interface JobDistributionEntry {
  portalCode: string;
  displayName: string;
  costTier: string;
  postingMode: "feed" | "api" | "assisted";
  status: string;
  skipReason: string | null;
  portalUrl: string | null;
  postedAt: string | null;
  lastError: string | null;
  updatedAt: string | null;
}

@Controller("annix-orbit")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.VIEWER)
export class PortalAdaptersController {
  constructor(
    private readonly registry: PortalAdapterRegistry,
    private readonly jobPostingRepo: JobPostingRepository,
    private readonly portalPostingRepo: JobPostingPortalPostingRepository,
  ) {}

  @Get("portal-adapters")
  async list(): Promise<PortalAdapterSummary[]> {
    return this.registry.all().map((adapter) => ({
      code: adapter.portalCode,
      displayName: adapter.displayName,
      costTier: adapter.costTier,
      postingMode: adapter.postingMode,
      // The adapter's own `available` flag is the source of truth for whether a
      // channel can be dispatched to. Defaults to true when unset.
      available: adapter.available ?? true,
    }));
  }

  @Get("job-postings/:id/distribution")
  async distribution(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ): Promise<JobDistributionEntry[]> {
    await this.assertOwnedJob(id, req.user.companyId);
    const rows = await this.portalPostingRepo.findByJob(id);
    return rows.map((row) => {
      const channel = this.registry.byCode(row.portalCode);
      return {
        portalCode: row.portalCode,
        displayName: channel ? channel.displayName : row.portalCode,
        costTier: channel ? channel.costTier : "free",
        postingMode: channel ? channel.postingMode : "api",
        status: row.status,
        skipReason: row.skipReason ?? null,
        portalUrl: row.portalUrl ?? null,
        postedAt: row.postedAt ? row.postedAt.toISOString() : null,
        lastError: row.lastError ?? null,
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
      };
    });
  }

  @Post("job-postings/:id/distribution/:portalCode/mark-submitted")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async markSubmitted(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Param("portalCode") portalCode: string,
    @Body() body: { portalUrl?: string } | undefined,
  ): Promise<{ portalCode: string; status: string }> {
    await this.assertOwnedJob(id, req.user.companyId);
    const row = await this.portalPostingRepo.findByJobAndPortal(id, portalCode);
    if (!row) {
      throw new NotFoundException("This channel is not part of the job's distribution.");
    }
    const channel = this.registry.byCode(portalCode);
    if (!channel || channel.postingMode !== "assisted") {
      throw new ForbiddenException("Only assisted channels can be manually marked as submitted.");
    }
    // The recruiter confirms they posted it by hand. We can't verify externally,
    // so this is SUBMITTED (never POSTED with a fabricated id).
    row.status = JobPostingPortalStatus.SUBMITTED;
    row.skipReason = null;
    const trimmedUrl = body?.portalUrl?.trim();
    if (trimmedUrl) row.portalUrl = trimmedUrl;
    await this.portalPostingRepo.save(row);
    return { portalCode, status: row.status };
  }

  @Get("job-postings/:id/assisted-posting-pack")
  async assistedPack(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ): Promise<AssistedPostingPackEntry[]> {
    const job = await this.assertOwnedJob(id, req.user.companyId);
    return this.registry
      .all()
      .filter(
        (
          adapter,
        ): adapter is PortalAdapter & {
          assistedInstructions: NonNullable<PortalAdapter["assistedInstructions"]>;
        } => Boolean(adapter.assistedInstructions),
      )
      .map((adapter) => {
        const instructions = adapter.assistedInstructions(job);
        return {
          portalCode: adapter.portalCode,
          displayName: adapter.displayName,
          ...instructions,
        };
      });
  }

  private async assertOwnedJob(id: number, companyId: number) {
    const job = await this.jobPostingRepo.findById(id);
    if (!job) throw new NotFoundException("Job posting not found");
    if (job.companyId !== companyId) {
      throw new ForbiddenException("You can only access your own jobs.");
    }
    return job;
  }
}
