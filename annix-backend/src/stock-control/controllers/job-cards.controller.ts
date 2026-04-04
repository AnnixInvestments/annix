import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Logger,
  NotFoundException,
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
import { now, nowISO } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import {
  MarkOffcutAsWastageDto,
  ReturnRubberOffcutsDto,
  UpdateRubberPlanDto,
  UploadAmendmentDto,
  UploadAttachmentDto,
} from "../dto/additional.dto";
import { CreateAllocationDto } from "../dto/create-allocation.dto";
import { CreateJobCardDto } from "../dto/create-job-card.dto";
import { UpdateJobCardDto } from "../dto/update-job-card.dto";
import { RejectAllocationDto } from "../dto/workflow.dto";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { RubberDimensionOverride } from "../entities/rubber-dimension-override.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
import { parseRubberSpecNote, suggestPlyCombinations } from "../lib/rubberCuttingCalculator";
import { CoatingAnalysisService } from "../services/coating-analysis.service";
import { CpoService } from "../services/cpo.service";
import { DrawingExtractionService } from "../services/drawing-extraction.service";
import { JobCardService } from "../services/job-card.service";
import { JobCardImportService, sanitizeNotes } from "../services/job-card-import.service";
import { JobCardVersionService } from "../services/job-card-version.service";
import { JobCardWorkflowService } from "../services/job-card-workflow.service";
import { JobFileService } from "../services/job-file.service";
import { RequisitionService } from "../services/requisition.service";
import { StockAllocationService } from "../services/stock-allocation.service";

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
    private readonly jobCardImportService: JobCardImportService,
    private readonly jobFileService: JobFileService,
    private readonly stockAllocationService: StockAllocationService,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(RubberDimensionOverride)
    private readonly dimensionOverrideRepo: Repository<RubberDimensionOverride>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepo: Repository<StockMovement>,
    @InjectRepository(JobCardLineItem)
    private readonly lineItemRepo: Repository<JobCardLineItem>,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List job cards with optional status filter" })
  async list(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    const jobCards = await this.jobCardService.findAll(
      req.user.companyId,
      status,
      pageNum,
      limitNum,
    );
    const effectiveStatuses = await this.workflowService.effectiveWorkflowStatuses(
      req.user.companyId,
      jobCards.map((jc) => ({ id: jc.id, workflowStatus: jc.workflowStatus })),
    );
    return jobCards.map((jc) => ({
      ...jc,
      effectiveWorkflowStatus: effectiveStatuses[jc.id] || jc.workflowStatus,
    }));
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

  @StockControlRoles("admin")
  @Post("bulk-reanalyse")
  @ApiOperation({ summary: "Re-analyse all draft job cards" })
  async bulkReanalyse(@Req() req: any) {
    return this.coatingAnalysisService.bulkReanalyse(req.user.companyId);
  }

  @Post("deduplicate")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Merge duplicate job cards (same P/JC/JT numbers)" })
  async deduplicateJobCards(@Req() req: any) {
    return this.jobCardService.deduplicateJobCards(req.user.companyId);
  }

  @Get(":id/adjacent")
  @ApiOperation({ summary: "Previous and next job card IDs for navigation" })
  async adjacentIds(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.adjacentIds(req.user.companyId, id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Job card by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.findById(req.user.companyId, id);
  }

  @Get(":id/delivery-job-cards")
  @ApiOperation({ summary: "List delivery job cards linked to a parent JC" })
  async deliveryJobCards(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.deliveryJobCards(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("job-cards.create")
  @Post()
  @ApiOperation({ summary: "Create a job card" })
  async create(@Body() dto: CreateJobCardDto, @Req() req: any) {
    return this.jobCardService.create(req.user.companyId, dto);
  }

  @StockControlRoles("manager", "admin", "accounts")
  @PermissionKey("job-cards.update")
  @Put(":id")
  @ApiOperation({ summary: "Update a job card" })
  async update(@Req() req: any, @Param("id") id: number, @Body() dto: UpdateJobCardDto) {
    if (dto.status === "active" && !dto.skipTdsCheck) {
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

    const result = await this.jobCardService.update(req.user.companyId, id, dto);

    if (dto.status === "active") {
      const warnings: string[] = [];

      try {
        await this.workflowService.initializeWorkflow(
          req.user.companyId,
          id,
          { id: req.user.id, name: req.user.name },
          { advance: true },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Failed to initialize workflow for job card ${id}: ${message}`);
        warnings.push(`Workflow initialization failed: ${message}`);
      }

      try {
        await this.requisitionService.createFromJobCard(req.user.companyId, id, req.user.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Failed to create requisition for job card ${id}: ${message}`);
        warnings.push(`Requisition creation failed: ${message}`);
      }

      try {
        await this.cpoService.createCalloffRecords(req.user.companyId, id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Failed to create CPO calloff records for job card ${id}: ${message}`);
        warnings.push(`CPO calloff creation failed: ${message}`);
      }

      if (warnings.length > 0) {
        return { ...result, warnings };
      }
    }

    return result;
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("job-cards.delete")
  @Delete(":id")
  @ApiOperation({ summary: "Delete a job card" })
  async remove(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.remove(req.user.companyId, id);
  }

  @Post(":id/recalculate-m2")
  @ApiOperation({ summary: "Force recalculate m² for all pipe line items" })
  async recalculateM2(@Req() req: any, @Param("id") id: number) {
    const lineItems = await this.coatingAnalysisService.recalculateLineItemM2(
      req.user.companyId,
      id,
    );
    return { lineItems };
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

  @Patch(":id/coating-analysis/surface-prep")
  @ApiOperation({ summary: "Update surface prep for coating analysis" })
  async updateSurfacePrep(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: { extSurfacePrep?: string; intSurfacePrep?: string },
  ) {
    return this.coatingAnalysisService.updateSurfacePrep(req.user.companyId, id, {
      extSurfacePrep: body.extSurfacePrep,
      intSurfacePrep: body.intSurfacePrep,
    });
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

  @StockControlRoles("accounts", "manager", "admin")
  @Post(":id/coating-analysis/verify-tds")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload TDS to verify coating product volume solids" })
  async verifyCoatingTds(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.coatingAnalysisService.verifyFromTds(req.user.companyId, id, file);
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

  @StockControlRoles("admin")
  @Patch(":id/coating-analysis/coats/:index")
  @ApiOperation({ summary: "Update a coat line DFT values" })
  async updateCoat(
    @Req() req: any,
    @Param("id") id: number,
    @Param("index") index: number,
    @Body() body: { minDftUm?: number; maxDftUm?: number },
  ) {
    return this.coatingAnalysisService.updateCoat(req.user.companyId, id, Number(index), body);
  }

  @StockControlRoles("admin")
  @Delete(":id/coating-analysis/coats/:index")
  @ApiOperation({ summary: "Remove a coat line" })
  async removeCoat(@Req() req: any, @Param("id") id: number, @Param("index") index: number) {
    return this.coatingAnalysisService.removeCoat(req.user.companyId, id, Number(index));
  }

  @Get(":id/corrections")
  @ApiOperation({ summary: "List extraction corrections for a job card" })
  async listCorrections(@Req() req: any, @Param("id") id: number) {
    return this.coatingAnalysisService.corrections(req.user.companyId, id);
  }

  @StockControlRoles("admin", "accounts")
  @Post(":id/corrections")
  @ApiOperation({ summary: "Save an extraction correction" })
  async saveCorrection(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: { fieldName: string; originalValue: string | null; correctedValue: string },
  ) {
    return this.coatingAnalysisService.saveCorrection(
      req.user.companyId,
      id,
      body.fieldName,
      body.originalValue,
      body.correctedValue,
      req.user.id,
    );
  }

  @StockControlRoles("admin", "accounts")
  @Post(":id/re-extract")
  @ApiOperation({ summary: "Re-extract line items from source file with improved validation" })
  async reExtract(@Req() req: any, @Param("id") id: number) {
    const result = await this.jobCardImportService.reExtractLineItems(req.user.companyId, id);

    this.coatingAnalysisService.analyseJobCards([id], req.user.companyId).catch((err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Background coating analysis failed after re-extract: ${message}`);
    });

    return result;
  }

  @Get(":id/source-file-url")
  @ApiOperation({ summary: "Get presigned URL for the original imported file" })
  async sourceFileUrl(@Req() req: any, @Param("id") id: number) {
    const jobCard = await this.jobCardService.findById(req.user.companyId, id);
    if (!jobCard.sourceFilePath) {
      throw new NotFoundException("No source file stored for this job card");
    }
    const url = await this.storageService.presignedUrl(jobCard.sourceFilePath, 3600);
    return { url, fileName: jobCard.sourceFileName };
  }

  @StockControlRoles("admin", "accounts")
  @Post(":id/re-extract-notes")
  @ApiOperation({ summary: "Re-extract specifications from line item source notes" })
  async reExtractNotes(@Req() req: any, @Param("id") id: number) {
    const jobCard = await this.jobCardService.findById(req.user.companyId, id);
    const lineItemNotes = (jobCard.lineItems || [])
      .map((li: any) => (li.notes || "").trim())
      .filter(Boolean);

    const combined = lineItemNotes.join("\n");
    const fromLineItems = sanitizeNotes(combined);

    let cleaned = fromLineItems;
    if (!cleaned && jobCard.cpoId) {
      try {
        const cpo = await this.cpoService.findById(req.user.companyId, jobCard.cpoId);
        if (cpo?.coatingSpecs) {
          cleaned = sanitizeNotes(cpo.coatingSpecs);
        }
      } catch (err) {
        this.logger.warn(
          `Re-extract notes: CPO ${jobCard.cpoId} not found for job card ${id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    await this.jobCardService.update(req.user.companyId, id, { notes: cleaned });
    return { notes: cleaned };
  }

  @StockControlRoles("admin", "accounts")
  @PermissionKey("job-cards.line-items.manage")
  @Delete(":id/line-items/:lineItemId")
  @ApiOperation({ summary: "Delete a line item from a job card" })
  async deleteLineItem(
    @Req() req: any,
    @Param("id") id: number,
    @Param("lineItemId") lineItemId: number,
  ) {
    const lineItem = await this.lineItemRepo.findOne({
      where: { id: lineItemId, jobCardId: id, companyId: req.user.companyId },
    });
    if (!lineItem) {
      throw new BadRequestException("Line item not found");
    }
    await this.lineItemRepo.remove(lineItem);
    return { message: "Line item deleted" };
  }

  @StockControlRoles("admin", "accounts")
  @PermissionKey("job-cards.line-items.manage")
  @Post(":id/line-items")
  @ApiOperation({ summary: "Add a line item to a job card" })
  async addLineItem(
    @Req() req: any,
    @Param("id") id: number,
    @Body()
    body: {
      itemCode?: string;
      itemDescription?: string;
      itemNo?: string;
      quantity?: number;
      jtNo?: string;
      m2?: number;
    },
  ) {
    const jobCard = await this.jobCardService.findById(req.user.companyId, id);
    if (!jobCard) {
      throw new BadRequestException("Job card not found");
    }

    const maxSort = (jobCard.lineItems || []).reduce(
      (max: number, li: any) => (li.sortOrder > max ? li.sortOrder : max),
      0,
    );

    const lineItem = this.lineItemRepo.create({
      jobCardId: id,
      companyId: req.user.companyId,
      itemCode: body.itemCode || null,
      itemDescription: body.itemDescription || null,
      itemNo: body.itemNo || null,
      quantity: body.quantity || null,
      jtNo: body.jtNo || null,
      m2: body.m2 || null,
      sortOrder: maxSort + 1,
    });

    const saved = await this.lineItemRepo.save(lineItem);
    return saved;
  }

  @Get(":id/rubber-stock-options")
  @ApiOperation({ summary: "Rubber stock options and ply suggestions for a job card" })
  async rubberStockOptions(@Req() req: any, @Param("id") id: number) {
    const jobCard = await this.jobCardService.findById(req.user.companyId, id);

    const allNoteSources = [
      jobCard.notes || "",
      ...(jobCard.lineItems || []).map((li: any) => li.notes || ""),
      ...(jobCard.lineItems || []).map(
        (li: any) => `${li.itemCode || ""} ${li.itemDescription || ""}`,
      ),
    ].filter(Boolean);

    const rubberSpec = allNoteSources.reduce(
      (found: ReturnType<typeof parseRubberSpecNote>, text) => found || parseRubberSpecNote(text),
      null,
    );

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
      rollNumber: item.rollNumber || null,
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
  async updateRubberPlan(
    @Req() req: any,
    @Param("id") id: number,
    @Body() dto: UpdateRubberPlanDto,
  ) {
    const jobCard = await this.jobCardService.findById(req.user.companyId, id);
    jobCard.rubberPlanOverride = {
      status: dto.status,
      selectedPlyCombination: dto.selectedPlyCombination || null,
      manualRolls: dto.manualRolls || null,
      reviewedBy: req.user.name,
      reviewedAt: nowISO(),
    };
    const result = await this.jobCardService.update(req.user.companyId, id, {
      rubberPlanOverride: jobCard.rubberPlanOverride,
    });

    const overrides: any[] = dto.dimensionOverrides || [];
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
    @Body() dto: MarkOffcutAsWastageDto,
  ) {
    const companyId = req.user.companyId;

    const thicknessM = dto.thicknessMm / 1000;
    const widthM = dto.widthMm / 1000;
    const lengthM = dto.lengthMm / 1000;
    const volumeM3 = thicknessM * widthM * lengthM;
    const weightKg = volumeM3 * (dto.specificGravity || 1) * 1000;

    const colour = (dto.color || "Unknown").trim();
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
      notes: `Rubber offcut wastage from JC #${id}: ${dto.widthMm}mm x ${dto.lengthMm}mm x ${dto.thicknessMm}mm (SG ${dto.specificGravity}) = ${roundedKg} kg`,
      createdBy: req.user.name,
    });
    await this.stockMovementRepo.save(movement);

    const offcutSku = `RO-${id}-${Date.now()}`;
    const offcutItem = this.stockItemRepo.create({
      companyId,
      sku: offcutSku,
      name: `Rubber Offcut ${dto.widthMm}x${dto.lengthMm}mm ${dto.thicknessMm}mm ${colour}`,
      description: `Reusable rubber offcut from JC #${id}`,
      category: "rubber-sheet",
      unitOfMeasure: "piece",
      quantity: 1,
      minStockLevel: 0,
      color: colour,
      thicknessMm: dto.thicknessMm,
      widthMm: dto.widthMm,
      lengthM: lengthM,
      isLeftover: true,
      sourceJobCardId: id,
      sourceRollNumber: null,
    });
    const savedOffcut = await this.stockItemRepo.save(offcutItem);

    return { weightKg: roundedKg, stockItemId: wastageItem.id, offcutStockItemId: savedOffcut.id };
  }

  @StockControlRoles("manager", "admin")
  @Post(":id/rubber-offcuts/return")
  @ApiOperation({ summary: "Return consolidated rubber offcuts to stock as reusable items" })
  async returnRubberOffcuts(
    @Req() req: any,
    @Param("id") id: number,
    @Body() dto: ReturnRubberOffcutsDto,
  ) {
    const companyId = req.user.companyId;
    const createdBy = req.user.name || "System";
    const timestamp = Date.now();

    const createdItems = await Promise.all(
      dto.offcuts.map(async (offcut, idx) => {
        const colour = (offcut.color || "Unknown").trim();
        const offcutSku = `RO-${id}-${timestamp}-${idx}`;
        const lengthM = offcut.lengthMm / 1000;

        const stockItem = this.stockItemRepo.create({
          companyId,
          sku: offcutSku,
          name: `Rubber Offcut ${offcut.widthMm}x${offcut.lengthMm}mm ${offcut.thicknessMm}mm ${colour}`,
          description: `Reusable rubber offcut returned from JC #${id}`,
          category: "rubber-sheet",
          unitOfMeasure: "piece",
          quantity: 1,
          minStockLevel: 0,
          color: colour,
          thicknessMm: offcut.thicknessMm,
          widthMm: offcut.widthMm,
          lengthM,
          isLeftover: true,
          sourceJobCardId: id,
          rollNumber: offcut.rollNumber || null,
          sourceRollNumber: offcut.rollNumber || null,
        });
        const saved = await this.stockItemRepo.save(stockItem);

        const movement = this.stockMovementRepo.create({
          stockItem: saved,
          companyId,
          movementType: MovementType.IN,
          quantity: 1,
          referenceType: ReferenceType.RETURN,
          referenceId: id,
          notes: `Rubber offcut returned from JC #${id}: ${offcut.widthMm}mm x ${offcut.lengthMm}mm x ${offcut.thicknessMm}mm (${colour})`,
          createdBy,
        });
        await this.stockMovementRepo.save(movement);

        return { stockItemId: saved.id, widthMm: offcut.widthMm, lengthMm: offcut.lengthMm };
      }),
    );

    return { created: createdItems };
  }

  @Get(":id/offcuts-used")
  @ApiOperation({ summary: "Offcuts allocated to this job card with traceability info" })
  async offcutsUsed(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.offcutsUsedOnJobCard(req.user.companyId, id);
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
            lastUsedAt: now().toJSDate(),
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
            lastUsedAt: now().toJSDate(),
          });
        }
      }),
    );
  }

  @Post(":id/allocate")
  @ApiOperation({ summary: "Allocate stock to a job card" })
  async allocateStock(@Param("id") id: number, @Body() dto: CreateAllocationDto, @Req() req: any) {
    return this.jobCardService.allocateStock(req.user.companyId, {
      ...dto,
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
  @PermissionKey("job-cards.allocations")
  @ApiOperation({ summary: "All pending over-allocation approvals" })
  async pendingAllocations(@Req() req: any) {
    return this.jobCardService.pendingAllocations(req.user.companyId);
  }

  @Post(":id/allocations/:allocationId/approve")
  @StockControlRoles("manager", "admin")
  @PermissionKey("job-cards.allocations")
  @ApiOperation({ summary: "Approve an over-allocation request" })
  async approveOverAllocation(@Req() req: any, @Param("allocationId") allocationId: number) {
    return this.jobCardService.approveOverAllocation(req.user.companyId, allocationId, req.user.id);
  }

  @Post(":id/allocations/:allocationId/reject")
  @StockControlRoles("manager", "admin")
  @PermissionKey("job-cards.allocations")
  @ApiOperation({ summary: "Reject an over-allocation request" })
  async rejectOverAllocation(
    @Req() req: any,
    @Param("allocationId") allocationId: number,
    @Body() dto: RejectAllocationDto,
  ) {
    return this.jobCardService.rejectOverAllocation(req.user.companyId, allocationId, dto.reason);
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("allocations.undo")
  @Post(":id/allocations/:allocationId/undo")
  @ApiOperation({ summary: "Undo a stock allocation within 5 minutes" })
  async undoAllocation(
    @Req() req: any,
    @Param("id") id: number,
    @Param("allocationId") allocationId: number,
  ) {
    return this.jobCardService.undoAllocation(req.user.companyId, allocationId, {
      id: req.user.id,
      name: req.user.name,
    });
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
  @PermissionKey("job-cards.amendment")
  @Post(":id/amendment")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload an amendment to a job card" })
  async uploadAmendment(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAmendmentDto,
  ) {
    return this.versionService.createAmendment(
      req.user.companyId,
      id,
      file,
      dto.notes ?? null,
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
  @PermissionKey("job-cards.attachments")
  @Post(":id/attachments")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a drawing attachment" })
  async uploadAttachment(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAttachmentDto,
  ) {
    return this.drawingExtractionService.uploadAttachment(
      req.user.companyId,
      id,
      file,
      req.user.name,
      dto.notes ?? null,
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
  @PermissionKey("job-cards.attachments")
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

  @Get(":id/job-files")
  @ApiOperation({ summary: "List job files for a job card" })
  async jobFiles(@Req() req: any, @Param("id") id: number) {
    return this.jobFileService.filesForJobCard(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("job-cards.attachments")
  @Post(":id/job-files")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a job file" })
  async uploadJobFile(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.jobFileService.uploadFile(
      req.user.companyId,
      id,
      file,
      req.user.id || null,
      req.user.name || null,
    );
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("job-cards.attachments")
  @Delete(":id/job-files/:fileId")
  @ApiOperation({ summary: "Delete a job file" })
  async deleteJobFile(@Req() req: any, @Param("id") id: number, @Param("fileId") fileId: number) {
    await this.jobFileService.deleteFile(req.user.companyId, id, fileId, req.user.id || null);
    return { message: "Job file deleted" };
  }

  @Get(":id/job-files/:fileId/view-url")
  @ApiOperation({ summary: "Presigned URL for a job file" })
  async jobFileViewUrl(@Req() req: any, @Param("id") id: number, @Param("fileId") fileId: number) {
    return this.jobFileService.presignedUrlForFile(req.user.companyId, id, fileId);
  }

  @StockControlRoles("manager", "admin", "storeman")
  @Post(":id/allocation-plan")
  @ApiOperation({ summary: "Recommended allocation plan for a job card" })
  async allocationPlan(@Req() req: any, @Param("id") id: number) {
    return this.stockAllocationService.recommendedAllocations(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin", "storeman")
  @Post(":id/allocate-packs")
  @ApiOperation({ summary: "Allocate stock packs to a job card" })
  async allocatePacks(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: {
      items: Array<{
        stockItemId: number;
        packCount: number;
        sourceLeftoverItemId?: number | null;
      }>;
    },
  ) {
    return this.stockAllocationService.allocatePacks(
      req.user.companyId,
      id,
      body.items,
      req.user.staffMemberId || null,
      req.user.name || null,
    );
  }

  @StockControlRoles("manager", "admin", "storeman")
  @Post(":id/allocations/:allocationId/deallocate")
  @ApiOperation({ summary: "Deallocate a pending stock allocation" })
  async deallocateAllocation(
    @Req() req: any,
    @Param("id") id: number,
    @Param("allocationId") allocationId: number,
  ) {
    return this.stockAllocationService.deallocate(
      req.user.companyId,
      id,
      allocationId,
      req.user.name || null,
    );
  }

  @StockControlRoles("manager", "admin", "storeman")
  @Post(":id/confirm-issuance")
  @ApiOperation({ summary: "Confirm physical issuance of allocated stock" })
  async confirmIssuance(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: { allocationIds: number[] },
  ) {
    return this.stockAllocationService.confirmIssuance(
      req.user.companyId,
      id,
      body.allocationIds,
      req.user.name || null,
    );
  }

  @StockControlRoles("manager", "admin", "storeman")
  @Post(":id/allocations/:allocationId/return")
  @ApiOperation({ summary: "Return leftover paint from an allocation" })
  async returnLeftovers(
    @Req() req: any,
    @Param("id") id: number,
    @Param("allocationId") allocationId: number,
    @Body() body: { litresReturned: number; notes?: string },
  ) {
    return this.stockAllocationService.returnLeftovers(
      req.user.companyId,
      id,
      allocationId,
      body.litresReturned,
      req.user.name || null,
      req.user.staffMemberId || null,
      body.notes || null,
    );
  }

  @StockControlRoles("manager", "admin")
  @Patch(":id/coating-analysis/stock-assessment")
  @ApiOperation({ summary: "PM edits to stock assessment quantities" })
  async updateStockAssessment(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: {
      items: Array<{
        product: string;
        stockItemId: number | null;
        stockItemName: string | null;
        currentStock: number;
        required: number;
        unit: string;
        sufficient: boolean;
      }>;
    },
  ) {
    return this.coatingAnalysisService.updateStockAssessment(
      req.user.companyId,
      id,
      body.items,
      req.user.name || "PM",
    );
  }
}
