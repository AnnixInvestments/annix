import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { ImportMappingConfig } from "../entities/job-card-import-mapping.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
import { CoatingAnalysisService } from "../services/coating-analysis.service";
import { JobCardImportRow, JobCardImportService } from "../services/job-card-import.service";
import { JobCardWorkflowService } from "../services/job-card-workflow.service";
import { M2CalculationService } from "../services/m2-calculation.service";
import { WorkflowNotificationService } from "../services/workflow-notification.service";

@ApiTags("Stock Control - Job Card Import")
@Controller("stock-control/job-card-import")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
@StockControlRoles("manager", "admin")
@PermissionKey("job-cards.import")
export class JobCardImportController {
  private readonly logger = new Logger(JobCardImportController.name);

  constructor(
    private readonly jobCardImportService: JobCardImportService,
    private readonly m2CalculationService: M2CalculationService,
    private readonly coatingAnalysisService: CoatingAnalysisService,
    private readonly notificationService: WorkflowNotificationService,
    private readonly workflowService: JobCardWorkflowService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload and parse a file for job card import" })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const {
      grid,
      documentNumber: pdfDocNumber,
      drawingRows,
    } = await this.jobCardImportService.parseFile(file.buffer, file.mimetype, file.originalname);
    const savedMapping = await this.jobCardImportService.mapping(req.user.companyId);
    const docMatch = file.originalname?.match(/^([A-Z]{1,5}\d{4,})/i);
    const documentNumber = pdfDocNumber || (docMatch ? docMatch[1].toUpperCase() : null);

    const storagePath = `${StorageArea.STOCK_CONTROL}/job-card-imports/company-${req.user.companyId}`;
    const stored = await this.storageService.upload(file, storagePath);

    return {
      grid,
      savedMapping,
      documentNumber,
      drawingRows,
      sourceFilePath: stored.path,
      sourceFileName: file.originalname,
    };
  }

  @Post("upload-drawings")
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({ summary: "Upload multiple drawing PDFs for vision-based job card import" })
  async uploadDrawings(@UploadedFiles() files: Express.Multer.File[], @Req() req: any) {
    const pdfFiles = files.filter(
      (f) => f.mimetype === "application/pdf" || f.originalname.toLowerCase().endsWith(".pdf"),
    );

    if (pdfFiles.length === 0) {
      return { drawingRows: [], documentNumber: null, sourceFilePaths: [] };
    }

    const storagePath = `${StorageArea.STOCK_CONTROL}/job-card-imports/company-${req.user.companyId}`;
    const storedFiles = await Promise.all(
      pdfFiles.map((f) => this.storageService.upload(f, storagePath)),
    );

    const pdfBuffers = pdfFiles.map((f) => ({
      buffer: f.buffer,
      filename: f.originalname,
    }));

    const { drawingRows, documentNumber } =
      await this.jobCardImportService.parseDrawingPdfs(pdfBuffers);

    const sourceFilePaths = storedFiles.map((s, i) => ({
      path: s.path,
      name: pdfFiles[i].originalname,
    }));

    return {
      grid: [] as string[][],
      savedMapping: null,
      documentNumber,
      drawingRows,
      sourceFilePath: sourceFilePaths[0]?.path || null,
      sourceFileName: sourceFilePaths[0]?.name || null,
    };
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

  @Post("auto-detect")
  @ApiOperation({ summary: "Auto-detect column mapping using AI" })
  async autoDetect(@Body() body: { grid: string[][] }, @Req() req: any) {
    return this.jobCardImportService.autoDetectMapping(body.grid, req.user.companyId);
  }

  @Post("calculate-m2")
  @ApiOperation({ summary: "Calculate m2 surface area for line item descriptions" })
  async calculateM2(@Body() body: { descriptions: string[] }) {
    return this.m2CalculationService.calculateM2ForItems(body.descriptions);
  }

  @Post("confirm")
  @ApiOperation({ summary: "Confirm and import mapped job card rows" })
  async confirm(
    @Body()
    body: {
      rows: JobCardImportRow[];
      sourceFilePath?: string | null;
      sourceFileName?: string | null;
    },
    @Req() req: any,
  ) {
    const result = await this.jobCardImportService.importJobCards(
      req.user.companyId,
      body.rows,
      body.sourceFilePath || null,
      body.sourceFileName || null,
    );

    if (result.createdJobCardIds.length > 0) {
      this.coatingAnalysisService
        .analyseJobCards(result.createdJobCardIds, req.user.companyId)
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Unknown error";
          this.logger.error(`Background coating analysis failed: ${message}`);
        });

      const user = { id: req.user.id, name: req.user.name };
      Promise.all(
        result.createdJobCardIds.map((jobCardId) =>
          this.workflowService.initializeWorkflow(req.user.companyId, jobCardId, user),
        ),
      ).catch((err) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Workflow initialization failed: ${message}`);
      });
    }

    return result;
  }

  @Post("confirm-delivery-matches")
  @ApiOperation({ summary: "Confirm fuzzy-matched delivery line items against CPO" })
  async confirmDeliveryMatches(
    @Body()
    body: {
      jobCardId: number;
      matches: { deliveryItemId: number; cpoItemId: number }[];
    },
    @Req() req: any,
  ) {
    await this.jobCardImportService.confirmDeliveryMatches(
      req.user.companyId,
      body.jobCardId,
      body.matches,
    );

    const user = { id: req.user.id, name: req.user.name };
    this.workflowService
      .initializeWorkflow(req.user.companyId, body.jobCardId, user)
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Workflow initialization failed for delivery JC: ${message}`);
      });

    return { success: true };
  }
}
