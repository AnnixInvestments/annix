import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { JobPostingService } from "../services/job-posting.service";
import { NixJobAssistService } from "../services/nix-job-assist.service";

@Controller("cv-assistant/job-postings")
@UseGuards(CvAssistantAuthGuard)
export class JobPostingController {
  constructor(
    private readonly jobPostingService: JobPostingService,
    private readonly nixJobAssist: NixJobAssistService,
  ) {}

  @Post()
  async create(@Request() req: { user: { companyId: number } }, @Body() dto: CreateJobPostingDto) {
    return this.jobPostingService.create(req.user.companyId, dto);
  }

  @Post("draft")
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
  async updateWizardDraft(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateJobWizardDto,
  ) {
    return this.jobPostingService.updateWizardDraft(req.user.companyId, id, dto);
  }

  @Post(":id/publish")
  async publish(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.publishDraft(req.user.companyId, id);
  }

  // Phase 2 — Nix in the form
  @Post(":id/nix/title-suggestions")
  async nixTitleSuggestions(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { title?: string } = {},
  ) {
    return this.nixJobAssist.titleSuggestions(req.user.companyId, id, body.title);
  }

  @Post(":id/nix/description")
  async nixDescription(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.description(req.user.companyId, id);
  }

  @Post(":id/nix/skill-suggestions")
  async nixSkillSuggestions(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.skillSuggestions(req.user.companyId, id);
  }

  @Post(":id/nix/quality-score")
  async nixQualityScore(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.qualityScore(req.user.companyId, id);
  }

  @Post(":id/nix/screening-questions")
  async nixScreeningQuestions(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.nixJobAssist.screeningQuestions(req.user.companyId, id);
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
  async update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateJobPostingDto,
  ) {
    return this.jobPostingService.update(req.user.companyId, id, dto);
  }

  @Delete(":id")
  async delete(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.jobPostingService.delete(req.user.companyId, id);
    return { message: "Job posting deleted successfully" };
  }

  @Post(":id/activate")
  async activate(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.activate(req.user.companyId, id);
  }

  @Post(":id/pause")
  async pause(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.pause(req.user.companyId, id);
  }

  @Post(":id/close")
  async close(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.close(req.user.companyId, id);
  }
}
