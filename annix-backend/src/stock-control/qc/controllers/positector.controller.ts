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
import { StockControlRoleGuard, StockControlRoles } from "../../guards/stock-control-role.guard";
import { QcEnabledGuard } from "../guards/qc-enabled.guard";
import {
  PositectorService,
  type RegisterDeviceDto,
  type UpdateDeviceDto,
} from "../services/positector.service";
import { PositectorImportService } from "../services/positector-import.service";

@ApiTags("Stock Control - PosiTector Devices")
@Controller("stock-control/positector-devices")
@UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
export class PositectorController {
  private readonly logger = new Logger(PositectorController.name);

  constructor(
    private readonly positectorService: PositectorService,
    private readonly importService: PositectorImportService,
  ) {}

  @Post()
  @StockControlRoles("manager", "admin")
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

  @Get(":id")
  @ApiOperation({ summary: "Get a PosiTector device by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.positectorService.findById(req.user.companyId, id);
  }

  @Patch(":id")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Update a PosiTector device" })
  async updateDevice(@Req() req: any, @Param("id") id: number, @Body() body: UpdateDeviceDto) {
    return this.positectorService.updateDevice(req.user.companyId, id, body);
  }

  @Delete(":id")
  @StockControlRoles("manager", "admin")
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

    return { error: `Unsupported entity type: ${body.entityType}` };
  }

  @Post("upload")
  @StockControlRoles("manager", "admin")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload a PosiTector batch file (JSON, CSV, or PosiSoft Desktop CSV)",
  })
  async uploadBatchFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const content = file.buffer.toString("utf-8");
    const format = this.positectorService.detectFileFormat(content, file.originalname);
    const batch = this.positectorService.parseFileUpload(content, file.originalname);
    const entityType = this.positectorService.detectQcEntityType(batch.header.probeType);
    const suggestedCoatType = this.importService.detectCoatTypeFromBatchName(
      batch.header.batchName,
    );

    return {
      ...batch,
      detectedFormat: format,
      suggestedEntityType: entityType,
      suggestedCoatType,
      filename: file.originalname,
    };
  }

  @Post("upload/import")
  @StockControlRoles("manager", "admin")
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
    const content = file.buffer.toString("utf-8");
    const batch = this.positectorService.parseFileUpload(content, file.originalname);

    const entityType =
      body.entityType ?? this.positectorService.detectQcEntityType(batch.header.probeType);

    if (entityType === "dft") {
      return this.importService.importDftReadings(
        req.user.companyId,
        batch,
        {
          jobCardId: parseInt(body.jobCardId, 10),
          coatType: body.coatType === "final" ? ("final" as any) : ("primer" as any),
          paintProduct: body.paintProduct ?? "Unknown",
          batchNumber: body.batchNumber ?? null,
          specMinMicrons: parseFloat(body.specMinMicrons) || 0,
          specMaxMicrons: parseFloat(body.specMaxMicrons) || 0,
        },
        req.user,
      );
    }

    if (entityType === "blast_profile") {
      return this.importService.importBlastProfile(
        req.user.companyId,
        batch,
        {
          jobCardId: parseInt(body.jobCardId, 10),
          specMicrons: parseFloat(body.specMicrons) || 0,
          temperature: body.temperature ? parseFloat(body.temperature) : null,
          humidity: body.humidity ? parseFloat(body.humidity) : null,
        },
        req.user,
      );
    }

    if (entityType === "shore_hardness") {
      return this.importService.importShoreHardness(
        req.user.companyId,
        batch,
        {
          jobCardId: parseInt(body.jobCardId, 10),
          rubberSpec: body.rubberSpec ?? "Unknown",
          rubberBatchNumber: body.rubberBatchNumber ?? null,
          requiredShore: parseInt(body.requiredShore, 10) || 0,
        },
        req.user,
      );
    }

    return { error: `Unsupported entity type: ${entityType}` };
  }
}
