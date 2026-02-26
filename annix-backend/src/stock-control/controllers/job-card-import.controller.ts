import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ImportMappingConfig } from "../entities/job-card-import-mapping.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { CoatingAnalysisService } from "../services/coating-analysis.service";
import { JobCardImportRow, JobCardImportService } from "../services/job-card-import.service";
import { M2CalculationService } from "../services/m2-calculation.service";

@ApiTags("Stock Control - Job Card Import")
@Controller("stock-control/job-card-import")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
@StockControlRoles("manager", "admin")
export class JobCardImportController {
  private readonly logger = new Logger(JobCardImportController.name);

  constructor(
    private readonly jobCardImportService: JobCardImportService,
    private readonly m2CalculationService: M2CalculationService,
    private readonly coatingAnalysisService: CoatingAnalysisService,
  ) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload and parse a file for job card import" })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const { grid, documentNumber: pdfDocNumber } = await this.jobCardImportService.parseFile(
      file.buffer,
      file.mimetype,
      file.originalname,
    );
    const savedMapping = await this.jobCardImportService.mapping(req.user.companyId);
    const docMatch = file.originalname?.match(/^([A-Z]{1,5}\d{4,})/i);
    const documentNumber = pdfDocNumber || (docMatch ? docMatch[1].toUpperCase() : null);
    return { grid, savedMapping, documentNumber };
  }

  @Get("mapping")
  @ApiOperation({ summary: "Get saved column mapping for job card import" })
  async savedMapping(@Req() req: any) {
    return this.jobCardImportService.mapping(req.user.companyId);
  }

  @Post("mapping")
  @ApiOperation({ summary: "Save column mapping for job card import" })
  async saveMapping(@Body() body: { mappingConfig: ImportMappingConfig }, @Req() req: any) {
    return this.jobCardImportService.saveMapping(req.user.companyId, body.mappingConfig);
  }

  @Post("calculate-m2")
  @ApiOperation({ summary: "Calculate m2 surface area for line item descriptions" })
  async calculateM2(@Body() body: { descriptions: string[] }) {
    return this.m2CalculationService.calculateM2ForItems(body.descriptions);
  }

  @Post("confirm")
  @ApiOperation({ summary: "Confirm and import mapped job card rows" })
  async confirm(@Body() body: { rows: JobCardImportRow[] }, @Req() req: any) {
    const result = await this.jobCardImportService.importJobCards(req.user.companyId, body.rows);

    if (result.createdJobCardIds.length > 0) {
      this.coatingAnalysisService
        .analyseJobCards(result.createdJobCardIds, req.user.companyId)
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Unknown error";
          this.logger.error(`Background coating analysis failed: ${message}`);
        });
    }

    return result;
  }
}
