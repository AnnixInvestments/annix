import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import type { Response } from "express";
import { Repository } from "typeorm";
import { JobCardCoatingAnalysis } from "../../entities/coating-analysis.entity";
import { JobCard } from "../../entities/job-card.entity";
import { StockControlAuthGuard } from "../../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../../guards/stock-control-role.guard";
import { CertificateService } from "../../services/certificate.service";
import { DataBookPdfService } from "../../services/data-book-pdf.service";
import { QcEnabledGuard } from "../guards/qc-enabled.guard";
import { QcBatchAssignmentService } from "../services/qc-batch-assignment.service";
import { QcMeasurementService } from "../services/qc-measurement.service";

@ApiTags("Stock Control - CPO QC")
@Controller("stock-control/cpos/:cpoId/qc")
@UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
export class CpoQcController {
  private readonly logger = new Logger(CpoQcController.name);

  constructor(
    private readonly qcService: QcMeasurementService,
    private readonly batchService: QcBatchAssignmentService,
    private readonly dataBookPdfService: DataBookPdfService,
    private readonly certificateService: CertificateService,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingRepo: Repository<JobCardCoatingAnalysis>,
  ) {}

  @Get("control-plans")
  @ApiOperation({ summary: "Control plans for a CPO" })
  async controlPlansList(@Req() req: any, @Param("cpoId") cpoId: number) {
    return this.qcService.controlPlansForCpo(req.user.companyId, cpoId);
  }

  @Post("control-plans/auto-generate")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Auto-generate control plans for CPO" })
  async autoGenerateControlPlans(@Req() req: any, @Param("cpoId") cpoId: number) {
    return this.qcService.autoGenerateControlPlansForCpo(req.user.companyId, cpoId, req.user);
  }

  @Get("control-plans/:id/pdf")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Download CPO control plan as PDF" })
  async downloadControlPlanPdf(
    @Req() req: any,
    @Res() res: Response,
    @Param("cpoId") cpoId: number,
    @Param("id") id: number,
  ) {
    const firstChild = await this.jobCardRepo.findOne({
      where: { cpoId, companyId: req.user.companyId },
      order: { createdAt: "ASC" },
    });

    if (!firstChild) {
      throw new NotFoundException("No child job cards found for this CPO");
    }

    const buffer = await this.dataBookPdfService.generateControlPlanPdf(
      req.user.companyId,
      firstChild.id,
      id,
    );

    if (!buffer) {
      throw new NotFoundException("Control plan not found");
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="QCP_CPO_${id}.pdf"`,
      "Content-Length": buffer.length.toString(),
    });
    res.end(buffer);
  }

  @Get("control-plans/:id")
  @ApiOperation({ summary: "Single CPO control plan" })
  async controlPlanById(@Req() req: any, @Param("id") id: number) {
    return this.qcService.controlPlanById(req.user.companyId, id);
  }

  @Patch("control-plans/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Update CPO control plan" })
  async updateControlPlan(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.qcService.updateControlPlan(req.user.companyId, id, body);
  }

  @Delete("control-plans/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete CPO control plan" })
  async deleteControlPlan(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteControlPlan(req.user.companyId, id);
    return { deleted: true };
  }

  @Get("items-releases")
  @ApiOperation({ summary: "Items releases for a CPO" })
  async itemsReleasesList(@Req() req: any, @Param("cpoId") cpoId: number) {
    return this.qcService.itemsReleasesForCpo(req.user.companyId, cpoId);
  }

  @Delete("items-releases/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete CPO items release and cascaded child JC releases" })
  async deleteCpoItemsRelease(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteCpoItemsRelease(req.user.companyId, id);
    return { deleted: true };
  }

  @Get("releasable-items")
  @ApiOperation({ summary: "Items with arrival status for CPO release" })
  async releasableItems(@Req() req: any, @Param("cpoId") cpoId: number) {
    return this.qcService.releasableItemsForCpo(req.user.companyId, cpoId);
  }

  @Post("release-documents/auto-generate")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Generate release documents for CPO" })
  async autoGenerateReleaseDocuments(
    @Req() req: any,
    @Param("cpoId") cpoId: number,
    @Body() body: {
      selectedItems: {
        itemCode: string;
        description: string;
        quantity: number;
        jobCardId: number;
      }[];
      checkedBy?: { name: string; date: string; signature: string };
    },
  ) {
    return this.qcService.autoGenerateReleaseDocumentsForCpo(
      req.user.companyId,
      cpoId,
      body.selectedItems,
      req.user,
      body.checkedBy,
    );
  }

  @Get("items-releases/:id/pdf")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Download CPO items release as PDF" })
  async downloadItemsReleasePdf(
    @Req() req: any,
    @Res() res: Response,
    @Param("cpoId") cpoId: number,
    @Param("id") id: number,
  ) {
    const firstChild = await this.jobCardRepo.findOne({
      where: { cpoId, companyId: req.user.companyId },
      order: { createdAt: "ASC" },
    });

    if (!firstChild) {
      throw new NotFoundException("No child job cards found for this CPO");
    }

    const buffer = await this.dataBookPdfService.generateItemsReleasePdf(
      req.user.companyId,
      firstChild.id,
      id,
    );

    if (!buffer) {
      throw new NotFoundException("Items release not found");
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Release_CPO_${id}.pdf"`,
      "Content-Length": buffer.length.toString(),
    });
    res.end(buffer);
  }

  @Get("batch-assignments")
  @ApiOperation({ summary: "Batch assignments for a CPO" })
  async batchAssignmentsList(@Req() req: any, @Param("cpoId") cpoId: number) {
    return this.batchService.assignmentsForCpo(req.user.companyId, cpoId);
  }

  @Get("batch-assignments/summary")
  @ApiOperation({ summary: "Batch assignment completion summary for a CPO" })
  async batchAssignmentsSummary(@Req() req: any, @Param("cpoId") cpoId: number) {
    return this.batchService.completionSummaryForCpo(req.user.companyId, cpoId);
  }

  @Get("child-jc-line-items")
  @ApiOperation({ summary: "Line items from all child JCs with coating analysis" })
  async childJcLineItems(@Req() req: any, @Param("cpoId") cpoId: number) {
    const companyId = req.user.companyId;
    const childJcs = await this.jobCardRepo.find({
      where: { cpoId, companyId },
      relations: ["lineItems"],
      order: { createdAt: "ASC" },
    });

    const results = await Promise.all(
      childJcs.map(async (jc) => {
        const coating = await this.coatingRepo.findOne({
          where: { jobCardId: jc.id, companyId },
        });
        const items = (jc.lineItems || []).map((li) => ({
          id: li.id,
          jobCardId: jc.id,
          itemNo: li.itemNo || null,
          itemCode: li.itemCode || "",
          description: li.itemDescription || "",
          quantity: li.quantity || 0,
        }));
        return {
          jobCardId: jc.id,
          jcNumber: jc.jcNumber || jc.jobNumber,
          jtDnNumber: jc.jtDnNumber || null,
          coatingAnalysis: coating || null,
          lineItems: items,
        };
      }),
    );

    return results;
  }

  @Post("data-book")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Compile CPO-level data book merging all child JCs" })
  async compileCpoDataBook(
    @Req() req: any,
    @Res() res: Response,
    @Param("cpoId") cpoId: number,
    @Body() body?: { force?: boolean },
  ) {
    const result = await this.certificateService.compileCpoDataBook(
      req.user.companyId,
      cpoId,
      req.user,
      body?.force ?? false,
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
      "Content-Length": result.buffer.length.toString(),
    });
    res.end(result.buffer);
  }
}
