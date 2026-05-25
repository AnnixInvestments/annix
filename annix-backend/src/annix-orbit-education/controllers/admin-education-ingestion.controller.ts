import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { IngestAdmissionDto } from "../dto/ingest-admission.dto";
import { CorrectDraftDto } from "../dto/review-draft.dto";
import type { RequirementDraftStatus } from "../entities/education-requirement-draft.entity";
import {
  EducationAdmissionIngestionService,
  type IngestionResult,
} from "../services/education-admission-ingestion.service";
import {
  type DraftView,
  EducationDraftReviewService,
} from "../services/education-draft-review.service";

@ApiTags("Admin Orbit Education Ingestion")
@Controller("admin/annix-orbit/education")
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminEducationIngestionController {
  constructor(
    private readonly ingestionService: EducationAdmissionIngestionService,
    private readonly reviewService: EducationDraftReviewService,
  ) {}

  @Post("ingest")
  @ApiOperation({
    summary: "Scrape an admissions page into DRAFT requirements (screenshot + extraction)",
  })
  ingest(@Body() dto: IngestAdmissionDto): Promise<IngestionResult> {
    return this.ingestionService.ingest({
      institutionId: dto.institutionId ?? null,
      programmeId: dto.programmeId ?? null,
      intakeYear: dto.intakeYear,
      sourceUrl: dto.sourceUrl,
    });
  }

  @Get("drafts")
  @ApiOperation({ summary: "List requirement drafts for review (with screenshot + source URL)" })
  listDrafts(
    @Query("programmeId") programmeId?: string,
    @Query("institutionId") institutionId?: string,
    @Query("status") status?: RequirementDraftStatus,
  ): Promise<DraftView[]> {
    return this.reviewService.list({ programmeId, institutionId, status });
  }

  @Post("drafts/:id/approve")
  @ApiOperation({ summary: "Approve a draft requirement as-is (goes live)" })
  approve(@Param("id") id: string, @Req() req: { user?: { id?: number } }): Promise<DraftView> {
    return this.reviewService.approve(id, req.user?.id ?? null);
  }

  @Post("drafts/:id/correct")
  @ApiOperation({ summary: "Correct a draft's marks and approve it (logs the edit for Nix)" })
  correct(
    @Param("id") id: string,
    @Body() dto: CorrectDraftDto,
    @Req() req: { user?: { id?: number } },
  ): Promise<DraftView> {
    return this.reviewService.correct(id, dto.value, req.user?.id ?? null);
  }

  @Post("drafts/:id/reject")
  @ApiOperation({ summary: "Reject a draft requirement (never goes live)" })
  reject(@Param("id") id: string): Promise<DraftView> {
    return this.reviewService.reject(id);
  }
}
