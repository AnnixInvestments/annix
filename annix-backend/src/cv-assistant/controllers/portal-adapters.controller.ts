import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Request,
  UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobPosting } from "../entities/job-posting.entity";
import { AnnixOrbitAuthGuard } from "../guards/cv-assistant-auth.guard";
import { AssistedPostingInstructions, PortalAdapter } from "../services/portal-adapter.interface";
import { PortalAdapterRegistry } from "../services/portal-adapter-registry.service";

interface PortalAdapterSummary {
  code: string;
  displayName: string;
  costTier: string;
  postingMode: "api" | "assisted";
  available: boolean;
}

interface AssistedPostingPackEntry extends AssistedPostingInstructions {
  portalCode: string;
  displayName: string;
}

@Controller("cv-assistant")
@UseGuards(AnnixOrbitAuthGuard)
export class PortalAdaptersController {
  constructor(
    private readonly registry: PortalAdapterRegistry,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
  ) {}

  @Get("portal-adapters")
  async list(): Promise<PortalAdapterSummary[]> {
    return this.registry.all().map((adapter) => {
      const isAssisted = adapter.costTier === "assisted";
      return {
        code: adapter.portalCode,
        displayName: adapter.displayName,
        costTier: adapter.costTier,
        postingMode: isAssisted ? "assisted" : "api",
        available: adapter.costTier === "free" || isAssisted,
      };
    });
  }

  @Get("job-postings/:id/assisted-posting-pack")
  async assistedPack(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ): Promise<AssistedPostingPackEntry[]> {
    const job = await this.jobPostingRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException("Job posting not found");
    if (job.companyId !== req.user.companyId) {
      throw new ForbiddenException("You can only view packs for your own jobs.");
    }
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
}
