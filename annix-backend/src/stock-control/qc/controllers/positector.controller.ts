import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../../guards/stock-control-role.guard";
import { QcEnabledGuard } from "../guards/qc-enabled.guard";
import {
  PositectorService,
  type RegisterDeviceDto,
  type UpdateDeviceDto,
} from "../services/positector.service";
import { PositectorBundleSplitterService } from "../services/positector-bundle-splitter.service";
import { type ImportResult, PositectorImportService } from "../services/positector-import.service";
import { PositectorUploadService } from "../services/positector-upload.service";
import { QcMeasurementService } from "../services/qc-measurement.service";

@ApiTags("Stock Control - PosiTector Devices")
@Controller("stock-control/positector-devices")
@UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
export class PositectorController {
  private readonly logger = new Logger(PositectorController.name);

  constructor(
    private readonly positectorService: PositectorService,
    private readonly bundleSplitter: PositectorBundleSplitterService,
    private readonly importService: PositectorImportService,
    private readonly uploadService: PositectorUploadService,
    private readonly qcService: QcMeasurementService,
  ) {}

  @Post()
  @StockControlRoles("manager", "admin")
  @PermissionKey("positector.manage-devices")
  @ApiOperation({ summary: "Register a PosiTector device" })
  async registerDevice(@Req() req: any, @Body() body: RegisterDeviceDto) {
    return this.positectorService.registerDevice(req.user.companyId, body, req.user);
  }

  @Get()
  @ApiOperation({ summary: "List registered PosiTector devices" })
  async findAll(@Req() req: any, @Query("active") active?: string) {
    const filters: { active?: boolean } = {};

    if (active === "true") filters.active = true;
    if (active === "false") filters.active = false;

    return this.positectorService.findAll(req.user.companyId, filters);
  }

  // ── Permanent Upload Storage ────────────────────────────────────────
  // NOTE: These routes MUST be defined before @Get(":id") to prevent
  // NestJS from matching "uploads" as a device ID parameter.

  @Get("uploads")
  @ApiOperation({ summary: "List all stored PosiTector uploads" })
  async listUploads(
    @Req() req: any,
    @Query("unlinked") unlinked?: string,
    @Query("entityType") entityType?: string,
  ) {
    if (unlinked === "true") {
      return this.uploadService.unlinkedUploads(req.user.companyId, entityType);
    }
    return this.uploadService.allUploads(req.user.companyId);
  }

  @Get("uploads/:uploadId")
  @ApiOperation({ summary: "Get a stored PosiTector upload by ID" })
  async uploadById(@Req() req: any, @Param("uploadId") uploadId: number) {
    const upload = await this.uploadService.uploadById(req.user.companyId, uploadId);
    if (!upload) return { error: "Upload not found" };
    return upload;
  }

  @Get("uploads/:uploadId/download-url")
  @ApiOperation({ summary: "Get a presigned download URL for the original uploaded file" })
  async uploadDownloadUrl(@Req() req: any, @Param("uploadId") uploadId: number) {
    const upload = await this.uploadService.uploadById(req.user.companyId, uploadId);
    if (!upload) return { error: "Upload not found" };
    const url = await this.uploadService.presignedDownloadUrl(upload);
    return { url };
  }

  @Post("uploads/:uploadId/link")
  @StockControlRoles("manager", "admin")
  @PermissionKey("positector.upload-import")
  @ApiOperation({ summary: "Link a stored upload to a job card and import its data" })
  async linkUpload(
    @Req() req: any,
    @Param("uploadId") uploadId: number,
    @Body()
    body: {
      jobCardId: number;
      coatType?: string;
      paintProduct?: string;
      specMinMicrons?: number;
      specMaxMicrons?: number;
      specMicrons?: number;
      rubberSpec?: string;
      rubberBatchNumber?: string | null;
      requiredShore?: number;
    },
  ) {
    return this.uploadService.linkAndImport(
      req.user.companyId,
      uploadId,
      body.jobCardId,
      body,
      req.user,
    );
  }

  // ── Device Routes (dynamic :id must come after static routes) ──────

  @Get(":id")
  @ApiOperation({ summary: "Get a PosiTector device by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.positectorService.findById(req.user.companyId, id);
  }

  @Patch(":id")
  @StockControlRoles("manager", "admin")
  @PermissionKey("positector.manage-devices")
  @ApiOperation({ summary: "Update a PosiTector device" })
  async updateDevice(@Req() req: any, @Param("id") id: number, @Body() body: UpdateDeviceDto) {
    return this.positectorService.updateDevice(req.user.companyId, id, body);
  }

  @Delete(":id")
  @StockControlRoles("manager", "admin")
  @PermissionKey("positector.manage-devices")
  @ApiOperation({ summary: "Delete a PosiTector device" })
  async deleteDevice(@Req() req: any, @Param("id") id: number) {
    await this.positectorService.deleteDevice(req.user.companyId, id);
    return { deleted: true };
  }

  @Post(":id/check-connection")
  @ApiOperation({ summary: "Check connection to a PosiTector device" })
  async checkConnection(@Req() req: any, @Param("id") id: number) {
    return this.positectorService.checkConnection(req.user.companyId, id);
  }

  @Get(":id/batches")
  @ApiOperation({ summary: "List batches on a PosiTector device" })
  async listBatches(@Req() req: any, @Param("id") id: number) {
    return this.positectorService.listBatches(req.user.companyId, id);
  }

  @Get(":id/batches/:buid")
  @ApiOperation({ summary: "Fetch a specific batch from a PosiTector device" })
  async fetchBatch(@Req() req: any, @Param("id") id: number, @Param("buid") buid: string) {
    const batch = await this.positectorService.fetchBatch(req.user.companyId, id, buid);
    const entityType = this.positectorService.detectQcEntityType(batch.header.probeType);
    const suggestedCoatType = this.importService.detectCoatTypeFromBatchName(
      batch.header.batchName,
    );
    return { ...batch, suggestedEntityType: entityType, suggestedCoatType };
  }

  @Post(":id/batches/:buid/import")
  @StockControlRoles("manager", "admin")
  @PermissionKey("positector.upload-import")
  @ApiOperation({ summary: "Import a batch from a PosiTector device into a QC entity" })
  async importBatch(
    @Req() req: any,
    @Param("id") id: number,
    @Param("buid") buid: string,
    @Body()
    body: {
      jobCardId: number;
      entityType: string;
      coatType?: string;
      paintProduct?: string;
      batchNumber?: string | null;
      specMinMicrons?: number;
      specMaxMicrons?: number;
      specMicrons?: number;
      temperature?: number | null;
      humidity?: number | null;
      rubberSpec?: string;
      rubberBatchNumber?: string | null;
      requiredShore?: number;
    },
  ) {
    const batch = await this.positectorService.fetchBatch(req.user.companyId, id, buid);

    if (body.entityType === "dft") {
      return this.importService.importDftReadings(
        req.user.companyId,
        batch,
        {
          jobCardId: body.jobCardId,
          coatType: body.coatType === "final" ? ("final" as any) : ("primer" as any),
          paintProduct: body.paintProduct ?? "Unknown",
          batchNumber: body.batchNumber ?? null,
          specMinMicrons: body.specMinMicrons ?? 0,
          specMaxMicrons: body.specMaxMicrons ?? 0,
        },
        req.user,
      );
    }

    if (body.entityType === "blast_profile") {
      return this.importService.importBlastProfile(
        req.user.companyId,
        batch,
        {
          jobCardId: body.jobCardId,
          specMicrons: body.specMicrons ?? 0,
          temperature: body.temperature ?? null,
          humidity: body.humidity ?? null,
        },
        req.user,
      );
    }

    if (body.entityType === "shore_hardness") {
      return this.importService.importShoreHardness(
        req.user.companyId,
        batch,
        {
          jobCardId: body.jobCardId,
          rubberSpec: body.rubberSpec ?? "Unknown",
          rubberBatchNumber: body.rubberBatchNumber ?? null,
          requiredShore: body.requiredShore ?? 0,
        },
        req.user,
      );
    }

    if (body.entityType === "environmental") {
      return this.importService.importEnvironmental(
        req.user.companyId,
        batch,
        { jobCardId: body.jobCardId },
        req.user,
      );
    }

    return { error: `Unsupported entity type: ${body.entityType}` };
  }

  @Post("uploads/fix-bundle-names")
  @StockControlRoles("quality", "manager", "admin")
  @ApiOperation({
    summary: "Fix batch names on existing bundle-imported uploads by re-parsing PDFs",
  })
  async fixBundleNames(@Req() req: any) {
    return this.uploadService.fixBundleBatchNames(req.user.companyId);
  }

  @Post("upload/bundle-analyze")
  @StockControlRoles("quality", "manager", "admin")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Analyze a multi-report PosiTector PDF bundle and identify individual reports",
  })
  async analyzeBundlePdf(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: "No file uploaded" };
    }

    const result = await this.bundleSplitter.splitBundle(file.buffer);

    return {
      totalPages: result.totalPages,
      summaryPageCount: result.summaryPageCount,
      reports: result.reports.map((r) => ({
        batchName: r.batchName,
        pageStart: r.pageStart,
        pageEnd: r.pageEnd,
        pageCount: r.pageCount,
        instrumentType: r.instrumentType,
        probeSerial: r.probeSerial,
        createdAt: r.createdAt,
        entityType: r.entityType,
      })),
    };
  }

  @Post("upload/bundle-import")
  @StockControlRoles("quality", "manager", "admin")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Split a multi-report PosiTector PDF bundle and store each report as an upload",
  })
  async importBundlePdf(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: "No file uploaded" };
    }

    const result = await this.bundleSplitter.splitBundle(file.buffer);
    const uploads: Array<{
      uploadId: number;
      entityType: string;
      instrumentType: string;
      createdAt: string | null;
      pageRange: string;
      autoMatch: { jobCardId: number; jobNumber: string } | null;
    }> = [];

    for (const report of result.reports) {
      try {
        const batch = await this.positectorService.parsePosiSoftPdf(
          report.buffer,
          `${report.batchName}.pdf`,
        );
        if (!batch.header.batchName || batch.header.batchName.startsWith("bundle_")) {
          batch.header.batchName = report.batchName;
        }
        const entityType = this.positectorService.detectQcEntityType(batch.header.probeType);

        const dateLabel = report.createdAt ? report.createdAt.split(" ")[0] : "unknown";
        const multerFile: Express.Multer.File = {
          buffer: report.buffer,
          originalname: `${report.batchName}_${report.instrumentType}_${dateLabel}.pdf`,
          mimetype: "application/pdf",
          size: report.buffer.length,
          fieldname: "file",
          encoding: "7bit",
          stream: null as any,
          destination: "",
          filename: "",
          path: "",
        };

        const stored = await this.uploadService.storeUpload(
          req.user.companyId,
          multerFile,
          batch,
          entityType,
          "posisoft_pdf",
          req.user,
        );

        const autoMatch = await this.qcService.matchBatchName(
          req.user.companyId,
          batch.header.batchName,
        );

        if (autoMatch) {
          try {
            await this.uploadService.linkAndImport(
              req.user.companyId,
              stored.id,
              autoMatch.jobCardId,
              {},
              req.user,
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Auto-import for bundle report upload ${stored.id} failed: ${msg}`);
          }
        }

        uploads.push({
          uploadId: stored.id,
          entityType,
          instrumentType: report.instrumentType,
          createdAt: report.createdAt,
          pageRange: `${report.pageStart}-${report.pageEnd}`,
          autoMatch: autoMatch
            ? { jobCardId: autoMatch.jobCardId, jobNumber: autoMatch.jobNumber || "" }
            : null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to process bundle report pages ${report.pageStart}-${report.pageEnd}: ${msg}`,
        );
      }
    }

    return {
      totalPages: result.totalPages,
      reportsFound: result.reports.length,
      reportsImported: uploads.length,
      uploads,
    };
  }

  @Post("upload")
  @StockControlRoles("manager", "admin")
  @PermissionKey("positector.upload-import")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload a PosiTector file — permanently stored in S3 and DB, auto-matched if possible",
  })
  async uploadBatchFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const ext = file.originalname?.toLowerCase().split(".").pop() ?? "";
    const isPdf = ext === "pdf";

    const batch = isPdf
      ? await this.positectorService.parsePosiSoftPdf(file.buffer, file.originalname)
      : this.positectorService.parseFileUpload(file.buffer.toString("utf-8"), file.originalname);

    const format = isPdf
      ? "posisoft_pdf"
      : this.positectorService.detectFileFormat(file.buffer.toString("utf-8"), file.originalname);

    const entityType = this.positectorService.detectQcEntityType(batch.header.probeType);
    const suggestedCoatType = this.importService.detectCoatTypeFromBatchName(
      batch.header.batchName,
    );

    const stored = await this.uploadService.storeUpload(
      req.user.companyId,
      file,
      batch,
      entityType,
      format,
      req.user,
    );

    const autoMatch = await this.qcService.matchBatchName(
      req.user.companyId,
      batch.header.batchName,
    );

    let autoImportResult: (ImportResult & { uploadId: number }) | null = null;

    if (autoMatch) {
      try {
        autoImportResult = await this.uploadService.linkAndImport(
          req.user.companyId,
          stored.id,
          autoMatch.jobCardId,
          {
            coatType: autoMatch.coatDetail?.coatRole || undefined,
            paintProduct: autoMatch.coatDetail?.product || undefined,
            specMinMicrons: autoMatch.coatDetail?.minDftUm || undefined,
            specMaxMicrons: autoMatch.coatDetail?.maxDftUm || undefined,
          },
          req.user,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Auto-import for upload ${stored.id} failed: ${message}`);
      }
    }

    return {
      upload: stored,
      detectedFormat: format,
      suggestedEntityType: entityType,
      suggestedCoatType,
      filename: file.originalname,
      autoMatch,
      autoImportResult,
    };
  }

  @Post("upload/import")
  @StockControlRoles("manager", "admin")
  @PermissionKey("positector.upload-import")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload and directly import a PosiTector batch file into a QC entity",
  })
  async uploadAndImport(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: Record<string, string>,
  ) {
    const ext = file.originalname?.toLowerCase().split(".").pop() ?? "";
    const isPdf = ext === "pdf";

    const batch = isPdf
      ? await this.positectorService.parsePosiSoftPdf(file.buffer, file.originalname)
      : this.positectorService.parseFileUpload(file.buffer.toString("utf-8"), file.originalname);

    const entityType =
      body.entityType ?? this.positectorService.detectQcEntityType(batch.header.probeType);

    const format = isPdf
      ? "posisoft_pdf"
      : this.positectorService.detectFileFormat(file.buffer.toString("utf-8"), file.originalname);

    const stored = await this.uploadService.storeUpload(
      req.user.companyId,
      file,
      batch,
      entityType,
      format,
      req.user,
    );

    const jobCardId = parseInt(body.jobCardId, 10);

    const result = await this.uploadService.linkAndImport(
      req.user.companyId,
      stored.id,
      jobCardId,
      {
        coatType: body.coatType,
        paintProduct: body.paintProduct,
        specMinMicrons: body.specMinMicrons ? parseFloat(body.specMinMicrons) : undefined,
        specMaxMicrons: body.specMaxMicrons ? parseFloat(body.specMaxMicrons) : undefined,
        specMicrons: body.specMicrons ? parseFloat(body.specMicrons) : undefined,
        rubberSpec: body.rubberSpec,
        rubberBatchNumber: body.rubberBatchNumber || null,
        requiredShore: body.requiredShore ? parseInt(body.requiredShore, 10) : undefined,
      },
      req.user,
    );

    return result;
  }
}
