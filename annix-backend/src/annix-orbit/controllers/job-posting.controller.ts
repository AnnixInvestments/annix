import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CreateJobPostingDto, UpdateJobPostingDto } from "../dto/job-posting.dto";
import { UpdateJobWizardDto } from "../dto/job-wizard.dto";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { JobPostingService } from "../services/job-posting.service";
import { NixJobAssistService } from "../services/nix-job-assist.service";
import { SalaryBenchmarkService } from "../services/salary-benchmark.service";
import { TestCandidateSeederService } from "../services/test-candidate-seeder.service";

@Controller("annix-orbit/job-postings")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.VIEWER)
export class JobPostingController {
  constructor(
    private readonly jobPostingService: JobPostingService,
    private readonly nixJobAssist: NixJobAssistService,
    private readonly salaryBenchmarks: SalaryBenchmarkService,
    private readonly testCandidateSeeder: TestCandidateSeederService,
  ) {}

  @Get("salary-insights")
  @Header("Cache-Control", "public, max-age=3600")
  async salaryInsights(
    @Query("normalizedTitle") normalizedTitle: string,
    @Query("province") province?: string,
  ) {
    const row = await this.salaryBenchmarks.cachedBenchmark(normalizedTitle, province ?? null);
    if (!row) {
      return {
        normalizedTitle,
        province: province ?? null,
        sampleSize: 0,
        source: null,
        attribution: null,
      };
    }
    const minSalary = row.minSalary;
    const medianSalary = row.medianSalary;
    const maxSalary = row.maxSalary;
    return {
      normalizedTitle: row.normalizedTitle,
      province: row.province,
      p25: minSalary != null ? Number(minSalary) : null,
      p50: medianSalary != null ? Number(medianSalary) : null,
      p75: maxSalary != null ? Number(maxSalary) : null,
      sampleSize: row.sampleSize,
      confidence: Number(row.confidence),
      source: row.source,
      updatedAt: row.updatedAt,
      attribution:
        row.source === "adzuna"
          ? "Salary aggregates powered by Adzuna SA. Individual postings remain the property of their respective publishers."
          : null,
    };
  }

  @Post()
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async create(@Request() req: { user: { companyId: number } }, @Body() dto: CreateJobPostingDto) {
    return this.jobPostingService.create(req.user.companyId, dto);
  }

  @Post("draft")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async createDraft(@Request() req: { user: { companyId: number } }) {
    return this.jobPostingService.createDraft(req.user.companyId);
  }

  @Get(":id/wizard")
  async findWizardDraft(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.findWizardDraft(req.user.companyId, id);
  }

  @Patch(":id/wizard")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async updateWizardDraft(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateJobWizardDto,
  ) {
    return this.jobPostingService.updateWizardDraft(req.user.companyId, id, dto);
  }

  @Post(":id/publish")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async publish(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { testMode?: boolean } = {},
  ) {
    return this.jobPostingService.publishDraft(req.user.companyId, id, {
      testMode: Boolean(body.testMode),
    });
  }

  @Post(":id/seed-test-candidates")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async seedTestCandidates(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { count?: number } = {},
  ) {
    const count = body.count ?? 10;
    return this.testCandidateSeeder.seedForJobPosting(req.user.companyId, id, count);
  }

  @Delete(":id/test-candidates")
  @AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
  async clearTestCandidates(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.testCandidateSeeder.clearForJobPosting(req.user.companyId, id);
  }

  // Phase 2 — Nix in the form
  @Post(":id/nix/title-suggestions")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixTitleSuggestions(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { title?: string } = {},
  ) {
    return this.nixJobAssist.titleSuggestions(req.user.companyId, id, body.title);
  }

  @Post(":id/nix/outcomes-draft")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixOutcomesDraft(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.outcomesDraft(req.user.companyId, id);
  }

  @Post(":id/nix/description")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixDescription(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.description(req.user.companyId, id);
  }

  @Post(":id/nix/skill-suggestions")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixSkillSuggestions(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.skillSuggestions(req.user.companyId, id);
  }

  @Post(":id/nix/requirements-suggestions")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixRequirementsSuggestions(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.requirementsSuggestions(req.user.companyId, id);
  }

  @Post(":id/nix/quality-score")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixQualityScore(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.qualityScore(req.user.companyId, id);
  }

  @Post(":id/nix/screening-questions")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixScreeningQuestions(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.screeningQuestions(req.user.companyId, id);
  }

  @Post(":id/nix/salary-guidance")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixSalaryGuidance(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.salaryGuidance(req.user.companyId, id);
  }

  @Post(":id/nix/sourcing-queries")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixSourcingQueries(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.sourcingQueries(req.user.companyId, id);
  }

  @Post(":id/nix/predicted-volume")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async nixPredictedVolume(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.predictedVolume(req.user.companyId, id);
  }

  @Get()
  async findAll(@Request() req: { user: { companyId: number } }, @Query("status") status?: string) {
    return this.jobPostingService.findAll(req.user.companyId, status);
  }

  @Get(":id")
  async findById(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.findById(req.user.companyId, id);
  }

  @Patch(":id")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateJobPostingDto,
  ) {
    return this.jobPostingService.update(req.user.companyId, id, dto);
  }

  @Delete(":id")
  @AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
  async delete(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.jobPostingService.delete(req.user.companyId, id);
    return { message: "Job posting deleted successfully" };
  }

  @Post(":id/activate")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async activate(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.activate(req.user.companyId, id);
  }

  @Post(":id/pause")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async pause(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.pause(req.user.companyId, id);
  }

  @Post(":id/close")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async close(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.close(req.user.companyId, id);
  }
}
