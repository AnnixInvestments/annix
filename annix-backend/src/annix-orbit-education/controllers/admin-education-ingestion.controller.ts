import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { IngestAdmissionDto } from "../dto/ingest-admission.dto";
import {
  EducationAdmissionIngestionService,
  type IngestionResult,
} from "../services/education-admission-ingestion.service";

@ApiTags("Admin Orbit Education Ingestion")
@Controller("admin/annix-orbit/education")
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminEducationIngestionController {
  constructor(private readonly ingestionService: EducationAdmissionIngestionService) {}

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
}
