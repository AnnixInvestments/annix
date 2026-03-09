import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, MoreThan, Repository } from "typeorm";
import { RubberDimensionOverride } from "../entities/rubber-dimension-override.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { parseRubberSpecNote, suggestPlyCombinations } from "../lib/rubberCuttingCalculator";
import { CoatingAnalysisService } from "../services/coating-analysis.service";
import { CpoService } from "../services/cpo.service";
import { DrawingExtractionService } from "../services/drawing-extraction.service";
import { JobCardService } from "../services/job-card.service";
import { JobCardVersionService } from "../services/job-card-version.service";
import { JobCardWorkflowService } from "../services/job-card-workflow.service";
import { RequisitionService } from "../services/requisition.service";

@ApiTags("Stock Control - Job Cards")
@Controller("stock-control/job-cards")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class JobCardsController {
  private readonly logger = new Logger(JobCardsController.name);

  constructor(
    private readonly jobCardService: JobCardService,
    private readonly coatingAnalysisService: CoatingAnalysisService,
    private readonly requisitionService: RequisitionService,
    private readonly versionService: JobCardVersionService,
    private readonly drawingExtractionService: DrawingExtractionService,
    private readonly workflowService: JobCardWorkflowService,
    private readonly cpoService: CpoService,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(RubberDimensionOverride)
    private readonly dimensionOverrideRepo: Repository<RubberDimensionOverride>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepo: Repository<StockMovement>,
  ) {}

  @Get()
  @ApiOperation({ summary: "List job cards with optional status filter" })
  async list(@Req() req: any, @Query("status") status?: string) {
    return this.jobCardService.findAll(req.user.companyId, status);
  }

  @Get("rubber-dimension-suggestions")
  @ApiOperation({ summary: "Query learned rubber dimension overrides" })
  async rubberDimensionSuggestions(@Req() req: any, @Query() query: any) {
    const companyId = req.user.companyId;
    const results = await this.dimensionOverrideRepo
      .createQueryBuilder("o")
      .where("o.company_id = :companyId", { companyId })
      .andWhere("COALESCE(o.item_type, '') = COALESCE(:itemType, '')", {
        itemType: query.itemType || null,
      })
      .andWhere("COALESCE(o.nb_mm, 0) = COALESCE(:nbMm, 0)", {
        nbMm: query.nbMm ? Number(query.nbMm) : null,
      })
      .andWhere("COALESCE(o.schedule, '') = COALESCE(:schedule, '')", {
        schedule: query.schedule || null,
      })
      .andWhere("o.pipe_length_mm = :pipeLengthMm", {
        pipeLengthMm: Number(query.pipeLengthMm),
      })
      .andWhere("COALESCE(o.flange_config, '') = COALESCE(:flangeConfig, '')", {
        flangeConfig: query.flangeConfig || null,
      })
      .orderBy("o.usage_count", "DESC")
      .limit(1)
      .getMany();

    return results;
  }

  @Get(":id")
  @ApiOperation({ summary: "Job card by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.findById(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @Post()
  @ApiOperation({ summary: "Create a job card" })
  async create(@Body() body: any, @Req() req: any) {
    return this.jobCardService.create(req.user.companyId, { ...body, createdBy: req.user.name });
  }

  @StockControlRoles("manager", "admin")
  @Put(":id")
  @ApiOperation({ summary: "Update a job card" })
  async update(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    if (body.status === "active") {
      const unverified = await this.coatingAnalysisService.unverifiedProducts(
        req.user.companyId,
        id,
      );
      if (unverified.length > 0) {
        const names = unverified.map((u) => u.product).join(", ");
        throw new BadRequestException(
          `Cannot activate: unverified coating products require TDS upload: ${names}`,
        );
      }
    }

    const result = await this.jobCardService.update(req.user.companyId, id, body);

    if (body.status === "active") {
      try {
        await this.workflowService.initializeWorkflow(req.user.companyId, id, {
          id: req.user.id,
          name: req.user.name,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Failed to initialize workflow for job card ${id}: ${message}`);
      }

      try {
        await this.requisitionService.createFromJobCard(req.user.companyId, id, req.user.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Failed to create requisition for job card ${id}: ${message}`);
      }

      try {
        await this.cpoService.createCalloffRecords(req.user.companyId, id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Failed to create CPO calloff records for job card ${id}: ${message}`);
      }
    }

    return result;
  }

  @StockControlRoles("manager", "admin")
  @Delete(":id")
  @ApiOperation({ summary: "Delete a job card" })
  async remove(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.remove(req.user.companyId, id);
  }

  @Get(":id/coating-analysis")
  @ApiOperation({ summary: "Coating analysis for a job card" })
  async coatingAnalysis(@Req() req: any, @Param("id") id: number) {
    return this.coatingAnalysisService.findByJobCard(req.user.companyId, id);
  }

  @Post(":id/coating-analysis")
  @ApiOperation({ summary: "Trigger coating analysis for a job card" })
  async triggerCoatingAnalysis(@Req() req: any, @Param("id") id: number) {
    return this.coatingAnalysisService.analyseJobCard(id, req.user.companyId);
  }

  @Put(":id/coating-analysis/surface-area")
  @ApiOperation({ summary: "Update surface area for coating analysis" })
  async updateSurfaceArea(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: { extM2: number; intM2: number },
  ) {
    return this.coatingAnalysisService.updateSurfaceArea(
      req.user.companyId,
      id,
      body.extM2,
      body.intM2,
    );
  }

  @Get(":id/coating-analysis/unverified")
  @ApiOperation({ summary: "Unverified coating products for a job card" })
  async unverifiedCoatingProducts(@Req() req: any, @Param("id") id: number) {
    return this.coatingAnalysisService.unverifiedProducts(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @Post(":id/coating-analysis/verify-tds")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload TDS to verify coating product volume solids" })
  async verifyCoatingTds(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.coatingAnalysisService.verifyFromTds(req.user.companyId, id, file.buffer);
  }

  @Patch(":id/coating-analysis/accept")
  @ApiOperation({ summary: "Accept coating analysis recommendation" })
  async acceptCoatingAnalysis(@Req() req: any, @Param("id") id: number) {
    return this.coatingAnalysisService.acceptRecommendation(
      req.user.companyId,
      id,
      req.user.name || req.user.email || req.user.uid,
    );
  }

  @Get(":id/rubber-stock-options")
  @ApiOperation({ summary: "Rubber stock options and ply suggestions for a job card" })
  async rubberStockOptions(@Req() req: any, @Param("id") id: number) {
    const jobCard = await this.jobCardService.findById(req.user.companyId, id);

    const allText = [
      jobCard.notes || "",
      ...(jobCard.lineItems || []).map(
        (li: any) => `${li.itemCode || ""} ${li.itemDescription || ""}`,
      ),
    ].join(" ");

    const rubberSpec = parseRubberSpecNote(allText);

    const rubberStock = await this.stockItemRepo.find({
      where: {
        companyId: req.user.companyId,
        category: ILike("%rubber%"),
        quantity: MoreThan(0),
      },
      order: { thicknessMm: "ASC", widthMm: "ASC" },
    });

    const stockItems = rubberStock.map((item) => ({
      stockItemId: item.id,
      thicknessMm: item.thicknessMm ? Number(item.thicknessMm) : null,
      widthMm: item.widthMm ? Number(item.widthMm) : null,
      lengthM: item.lengthM ? Number(item.lengthM) : null,
      color: item.color,
      compoundCode: item.compoundCode,
      quantityAvailable: item.quantity,
      name: item.name,
    }));

    const availableThicknesses = [
      ...new Set(
        stockItems.filter((s) => s.thicknessMm !== null).map((s) => s.thicknessMm as number),
      ),
    ];

    const plyCombinations = rubberSpec
      ? suggestPlyCombinations(rubberSpec.thicknessMm).map((combo) => ({
          thicknesses: combo,
          allInStock: combo.every((t) => availableThicknesses.includes(t)),
          partiallyInStock: combo.some((t) => availableThicknesses.includes(t)),
        }))
      : [];

    return {
      rubberSpec,
      stockItems,
      availableThicknesses,
      plyCombinations,
    };
  }

  @StockControlRoles("manager", "admin")
  @Put(":id/rubber-plan")
  @ApiOperation({ summary: "Accept or override the rubber cutting plan" })
  async updateRubberPlan(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    const jobCard = await this.jobCardService.findById(req.user.companyId, id);
    jobCard.rubberPlanOverride = {
      status: body.status,
      selectedPlyCombination: body.selectedPlyCombination || null,
      manualRolls: body.manualRolls || null,
      reviewedBy: req.user.name,
      reviewedAt: new Date().toISOString(),
    };
    const result = await this.jobCardService.update(req.user.companyId, id, {
      rubberPlanOverride: jobCard.rubberPlanOverride,
    });

    const overrides: any[] = body.dimensionOverrides || [];
    if (overrides.length > 0) {
      await this.upsertDimensionOverrides(req.user.companyId, overrides);
    }

    return result;
  }

  @StockControlRoles("manager", "admin")
  @Post(":id/rubber-wastage")
  @ApiOperation({ summary: "Mark an offcut as wastage and add to rubber wastage stock" })
  async markOffcutAsWastage(
    @Req() req: any,
    @Param("id") id: number,
    @Body()
    body: {
      widthMm: number;
      lengthMm: number;
      thicknessMm: number;
      color: string | null;
      specificGravity: number;
    },
  ) {
    const companyId = req.user.companyId;

    const thicknessM = body.thicknessMm / 1000;
    const widthM = body.widthMm / 1000;
    const lengthM = body.lengthMm / 1000;
    const volumeM3 = thicknessM * widthM * lengthM;
    const weightKg = volumeM3 * (body.specificGravity || 1) * 1000;

    const colour = (body.color || "Unknown").trim();
    const wastageName = `Rubber Wastage - ${colour}`;
    const wastageSku = `RW-${colour.toUpperCase().replace(/\s+/g, "-")}`;

    let wastageItem = await this.stockItemRepo.findOne({
      where: { companyId, sku: wastageSku, category: "rubber-wastage" },
    });

    if (!wastageItem) {
      wastageItem = this.stockItemRepo.create({
        companyId,
        sku: wastageSku,
        name: wastageName,
        description: `Rubber wastage scraps (${colour}). Mixed hardnesses/compounds allowed within same colour.`,
        category: "rubber-wastage",
        unitOfMeasure: "kg",
        quantity: 0,
        minStockLevel: 0,
        color: colour,
      });
      wastageItem = await this.stockItemRepo.save(wastageItem);
    }

    const roundedKg = Math.round(weightKg * 100) / 100;
    const wholeKg = Math.max(1, Math.round(weightKg));
    await this.stockItemRepo.update(wastageItem.id, {
      quantity: () => `quantity + ${wholeKg}`,
    });

    const movement = this.stockMovementRepo.create({
      stockItem: wastageItem,
      companyId,
      movementType: MovementType.IN,
      quantity: wholeKg,
      referenceType: ReferenceType.MANUAL,
      referenceId: id,
      notes: `Rubber offcut wastage from JC #${id}: ${body.widthMm}mm x ${body.lengthMm}mm x ${body.thicknessMm}mm (SG ${body.specificGravity}) = ${roundedKg} kg`,
      createdBy: req.user.name,
    });
    await this.stockMovementRepo.save(movement);

    return { weightKg: roundedKg, stockItemId: wastageItem.id };
  }

  private async upsertDimensionOverrides(companyId: number, overrides: any[]): Promise<void> {
    await Promise.all(
      overrides.map(async (ov) => {
        const existing = await this.dimensionOverrideRepo
          .createQueryBuilder("o")
          .where("o.company_id = :companyId", { companyId })
          .andWhere("COALESCE(o.item_type, '') = COALESCE(:itemType, '')", {
            itemType: ov.itemType || null,
          })
          .andWhere("COALESCE(o.nb_mm, 0) = COALESCE(:nbMm, 0)", {
            nbMm: ov.nbMm || null,
          })
          .andWhere("COALESCE(o.od_mm, 0) = COALESCE(:odMm, 0)", {
            odMm: ov.odMm || null,
          })
          .andWhere("COALESCE(o.schedule, '') = COALESCE(:schedule, '')", {
            schedule: ov.schedule || null,
          })
          .andWhere("o.pipe_length_mm = :pipeLengthMm", {
            pipeLengthMm: ov.pipeLengthMm,
          })
          .andWhere("COALESCE(o.flange_config, '') = COALESCE(:flangeConfig, '')", {
            flangeConfig: ov.flangeConfig || null,
          })
          .getOne();

        if (existing) {
          await this.dimensionOverrideRepo.update(existing.id, {
            overrideWidthMm: ov.overrideWidthMm,
            overrideLengthMm: ov.overrideLengthMm,
            calculatedWidthMm: ov.calculatedWidthMm,
            calculatedLengthMm: ov.calculatedLengthMm,
            usageCount: existing.usageCount + 1,
            lastUsedAt: new Date(),
          });
        } else {
          await this.dimensionOverrideRepo.save({
            companyId,
            itemType: ov.itemType || null,
            nbMm: ov.nbMm || null,
            odMm: ov.odMm || null,
            schedule: ov.schedule || null,
            pipeLengthMm: ov.pipeLengthMm,
            flangeConfig: ov.flangeConfig || null,
            calculatedWidthMm: ov.calculatedWidthMm,
            calculatedLengthMm: ov.calculatedLengthMm,
            overrideWidthMm: ov.overrideWidthMm,
            overrideLengthMm: ov.overrideLengthMm,
            usageCount: 1,
            lastUsedAt: new Date(),
          });
        }
      }),
    );
  }

  @Post(":id/allocate")
  @ApiOperation({ summary: "Allocate stock to a job card" })
  async allocateStock(@Param("id") id: number, @Body() body: any, @Req() req: any) {
    return this.jobCardService.allocateStock(req.user.companyId, {
      ...body,
      jobCardId: id,
      allocatedBy: req.user.name,
    });
  }

  @Get(":id/allocations")
  @ApiOperation({ summary: "Allocations for a job card" })
  async allocations(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.allocationsByJobCard(req.user.companyId, id);
  }

  @Get("allocations/pending")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "All pending over-allocation approvals" })
  async pendingAllocations(@Req() req: any) {
    return this.jobCardService.pendingAllocations(req.user.companyId);
  }

  @Post(":id/allocations/:allocationId/approve")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Approve an over-allocation request" })
  async approveOverAllocation(@Req() req: any, @Param("allocationId") allocationId: number) {
    return this.jobCardService.approveOverAllocation(req.user.companyId, allocationId, req.user.id);
  }

  @Post(":id/allocations/:allocationId/reject")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Reject an over-allocation request" })
  async rejectOverAllocation(
    @Req() req: any,
    @Param("allocationId") allocationId: number,
    @Body() body: { reason: string },
  ) {
    return this.jobCardService.rejectOverAllocation(req.user.companyId, allocationId, body.reason);
  }

  @Post(":id/allocations/:allocationId/photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a photo for an allocation" })
  async uploadAllocationPhoto(
    @Req() req: any,
    @Param("allocationId") allocationId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.jobCardService.uploadAllocationPhoto(req.user.companyId, allocationId, file);
  }

  @StockControlRoles("manager", "admin")
  @Post(":id/amendment")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload an amendment to a job card" })
  async uploadAmendment(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { notes?: string },
  ) {
    return this.versionService.createAmendment(
      req.user.companyId,
      id,
      file,
      body.notes ?? null,
      req.user.name,
    );
  }

  @Get(":id/versions")
  @ApiOperation({ summary: "Version history for a job card" })
  async versionHistory(@Req() req: any, @Param("id") id: number) {
    return this.versionService.versionHistory(req.user.companyId, id);
  }

  @Get(":id/versions/:versionId")
  @ApiOperation({ summary: "Version details for a job card" })
  async versionById(
    @Req() req: any,
    @Param("id") id: number,
    @Param("versionId") versionId: number,
  ) {
    return this.versionService.versionById(req.user.companyId, id, versionId);
  }

  @Get(":id/attachments")
  @ApiOperation({ summary: "Attachments for a job card" })
  async attachments(@Req() req: any, @Param("id") id: number) {
    return this.drawingExtractionService.attachments(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @Post(":id/attachments")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a drawing attachment" })
  async uploadAttachment(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { notes?: string },
  ) {
    return this.drawingExtractionService.uploadAttachment(
      req.user.companyId,
      id,
      file,
      req.user.name,
      body.notes ?? null,
    );
  }

  @Post(":id/attachments/:attachmentId/extract")
  @ApiOperation({ summary: "Trigger dimension extraction from attachment" })
  async triggerExtraction(
    @Req() req: any,
    @Param("id") id: number,
    @Param("attachmentId") attachmentId: number,
  ) {
    return this.drawingExtractionService.triggerExtraction(req.user.companyId, id, attachmentId);
  }

  @Post(":id/extract-all")
  @ApiOperation({ summary: "Extract dimensions from all attachments together" })
  async extractAll(@Req() req: any, @Param("id") id: number) {
    return this.drawingExtractionService.extractAllFromJobCard(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @Delete(":id/attachments/:attachmentId")
  @ApiOperation({ summary: "Delete an attachment" })
  async deleteAttachment(
    @Req() req: any,
    @Param("id") id: number,
    @Param("attachmentId") attachmentId: number,
  ) {
    await this.drawingExtractionService.deleteAttachment(req.user.companyId, id, attachmentId);
    return { message: "Attachment deleted" };
  }
}
