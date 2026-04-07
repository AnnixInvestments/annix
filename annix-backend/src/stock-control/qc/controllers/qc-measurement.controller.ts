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
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { StockControlAuthGuard } from "../../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../../guards/stock-control-role.guard";
import { CertificateService } from "../../services/certificate.service";
import { DataBookPdfService } from "../../services/data-book-pdf.service";
import { QcEnabledGuard } from "../guards/qc-enabled.guard";
import { PositectorUploadService } from "../services/positector-upload.service";
import { QcMeasurementService } from "../services/qc-measurement.service";
import { QcpApprovalService } from "../services/qcp-approval.service";

@ApiTags("Stock Control - QC Measurements")
@Controller("stock-control/job-cards/:jobCardId/qc")
@UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
export class QcMeasurementController {
  private readonly logger = new Logger(QcMeasurementController.name);

  constructor(
    private readonly qcService: QcMeasurementService,
    private readonly dataBookPdfService: DataBookPdfService,
    private readonly certificateService: CertificateService,
    private readonly approvalService: QcpApprovalService,
    private readonly positectorUploadService: PositectorUploadService,
  ) {}

  // ── Aggregate ──────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: "All QC measurements for a job card" })
  async allMeasurements(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.allMeasurementsForJobCard(req.user.companyId, jobCardId);
  }

  // ── Shore Hardness ─────────────────────────────────────────────────

  @Get("shore-hardness")
  @ApiOperation({ summary: "Shore hardness records for a job card" })
  async shoreHardnessList(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.shoreHardnessForJobCard(req.user.companyId, jobCardId);
  }

  @Get("shore-hardness/:id")
  @ApiOperation({ summary: "Single shore hardness record" })
  async shoreHardnessById(@Req() req: any, @Param("id") id: number) {
    return this.qcService.shoreHardnessById(req.user.companyId, id);
  }

  @Post("shore-hardness")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Create shore hardness record" })
  async createShoreHardness(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: any,
  ) {
    return this.qcService.createShoreHardness(req.user.companyId, jobCardId, body, req.user);
  }

  @Patch("shore-hardness/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Update shore hardness record" })
  async updateShoreHardness(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.qcService.updateShoreHardness(req.user.companyId, id, body);
  }

  @Delete("shore-hardness/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete shore hardness record" })
  async deleteShoreHardness(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteShoreHardness(req.user.companyId, id);
    return { deleted: true };
  }

  // ── DFT Readings ──────────────────────────────────────────────────

  @Get("dft-readings")
  @ApiOperation({ summary: "DFT readings for a job card" })
  async dftReadingsList(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.dftReadingsForJobCard(req.user.companyId, jobCardId);
  }

  @Get("dft-readings/:id")
  @ApiOperation({ summary: "Single DFT reading" })
  async dftReadingById(@Req() req: any, @Param("id") id: number) {
    return this.qcService.dftReadingById(req.user.companyId, id);
  }

  @Post("dft-readings")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Create DFT reading" })
  async createDftReading(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: any,
  ) {
    return this.qcService.createDftReading(req.user.companyId, jobCardId, body, req.user);
  }

  @Patch("dft-readings/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Update DFT reading" })
  async updateDftReading(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.qcService.updateDftReading(req.user.companyId, id, body);
  }

  @Delete("dft-readings/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete DFT reading" })
  async deleteDftReading(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteDftReading(req.user.companyId, id);
    return { deleted: true };
  }

  // ── Blast Profiles ────────────────────────────────────────────────

  @Get("blast-profiles")
  @ApiOperation({ summary: "Blast profiles for a job card" })
  async blastProfilesList(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.blastProfilesForJobCard(req.user.companyId, jobCardId);
  }

  @Get("blast-profiles/:id")
  @ApiOperation({ summary: "Single blast profile" })
  async blastProfileById(@Req() req: any, @Param("id") id: number) {
    return this.qcService.blastProfileById(req.user.companyId, id);
  }

  @Post("blast-profiles")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Create blast profile" })
  async createBlastProfile(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: any,
  ) {
    return this.qcService.createBlastProfile(req.user.companyId, jobCardId, body, req.user);
  }

  @Patch("blast-profiles/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Update blast profile" })
  async updateBlastProfile(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.qcService.updateBlastProfile(req.user.companyId, id, body);
  }

  @Delete("blast-profiles/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete blast profile" })
  async deleteBlastProfile(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteBlastProfile(req.user.companyId, id);
    return { deleted: true };
  }

  // ── Dust & Debris Tests ───────────────────────────────────────────

  @Get("dust-debris")
  @ApiOperation({ summary: "Dust/debris tests for a job card" })
  async dustDebrisTestsList(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.dustDebrisTestsForJobCard(req.user.companyId, jobCardId);
  }

  @Get("dust-debris/:id")
  @ApiOperation({ summary: "Single dust/debris test" })
  async dustDebrisTestById(@Req() req: any, @Param("id") id: number) {
    return this.qcService.dustDebrisTestById(req.user.companyId, id);
  }

  @Post("dust-debris")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Create dust/debris test" })
  async createDustDebrisTest(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: any,
  ) {
    return this.qcService.createDustDebrisTest(req.user.companyId, jobCardId, body, req.user);
  }

  @Patch("dust-debris/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Update dust/debris test" })
  async updateDustDebrisTest(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.qcService.updateDustDebrisTest(req.user.companyId, id, body);
  }

  @Delete("dust-debris/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete dust/debris test" })
  async deleteDustDebrisTest(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteDustDebrisTest(req.user.companyId, id);
    return { deleted: true };
  }

  // ── Pull Tests ────────────────────────────────────────────────────

  @Get("pull-tests")
  @ApiOperation({ summary: "Pull tests for a job card" })
  async pullTestsList(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.pullTestsForJobCard(req.user.companyId, jobCardId);
  }

  @Get("pull-tests/:id")
  @ApiOperation({ summary: "Single pull test" })
  async pullTestById(@Req() req: any, @Param("id") id: number) {
    return this.qcService.pullTestById(req.user.companyId, id);
  }

  @Post("pull-tests")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Create pull test" })
  async createPullTest(@Req() req: any, @Param("jobCardId") jobCardId: number, @Body() body: any) {
    return this.qcService.createPullTest(req.user.companyId, jobCardId, body, req.user);
  }

  @Patch("pull-tests/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Update pull test" })
  async updatePullTest(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.qcService.updatePullTest(req.user.companyId, id, body);
  }

  @Delete("pull-tests/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete pull test" })
  async deletePullTest(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deletePullTest(req.user.companyId, id);
    return { deleted: true };
  }

  // ── Control Plans ─────────────────────────────────────────────────

  @Get("control-plans")
  @ApiOperation({ summary: "Control plans for a job card" })
  async controlPlansList(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.controlPlansForJobCard(req.user.companyId, jobCardId);
  }

  @Post("control-plans/auto-generate")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Auto-generate control plans from coating analysis" })
  async autoGenerateControlPlans(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.autoGenerateControlPlans(req.user.companyId, jobCardId, req.user);
  }

  @Get("control-plans/:id/pdf")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Download control plan as PDF" })
  async downloadControlPlanPdf(
    @Req() req: any,
    @Res() res: Response,
    @Param("jobCardId") jobCardId: number,
    @Param("id") id: number,
  ) {
    const buffer = await this.dataBookPdfService.generateControlPlanPdf(
      req.user.companyId,
      jobCardId,
      id,
    );

    if (!buffer) {
      throw new NotFoundException("Control plan not found");
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="QCP_${id}.pdf"`,
      "Content-Length": buffer.length.toString(),
    });
    res.end(buffer);
  }

  @Get("control-plans/:id")
  @ApiOperation({ summary: "Single control plan" })
  async controlPlanById(@Req() req: any, @Param("id") id: number) {
    return this.qcService.controlPlanById(req.user.companyId, id);
  }

  @Post("control-plans")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Create control plan" })
  async createControlPlan(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: any,
  ) {
    return this.qcService.createControlPlan(req.user.companyId, jobCardId, body, req.user);
  }

  @Patch("control-plans/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Update control plan" })
  async updateControlPlan(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.qcService.updateControlPlan(req.user.companyId, id, body);
  }

  @Delete("control-plans/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete control plan" })
  async deleteControlPlan(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteControlPlan(req.user.companyId, id);
    return { deleted: true };
  }

  // ── Release Certificates ──────────────────────────────────────────

  @Get("release-certificates")
  @ApiOperation({ summary: "Release certificates for a job card" })
  async releaseCertificatesList(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.releaseCertificatesForJobCard(req.user.companyId, jobCardId);
  }

  @Get("release-certificates/:id/pdf")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Download release certificate as PDF" })
  async downloadReleaseCertificatePdf(
    @Req() req: any,
    @Res() res: Response,
    @Param("jobCardId") jobCardId: number,
    @Param("id") id: number,
  ) {
    const buffer = await this.dataBookPdfService.generateReleaseCertificatePdf(
      req.user.companyId,
      jobCardId,
      id,
    );

    if (!buffer) {
      throw new NotFoundException("Release certificate not found");
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="QD_PLS_10_Release_Certificate_${id}.pdf"`,
      "Content-Length": buffer.length.toString(),
    });
    res.end(buffer);
  }

  @Get("release-certificates/:id")
  @ApiOperation({ summary: "Single release certificate" })
  async releaseCertificateById(@Req() req: any, @Param("id") id: number) {
    return this.qcService.releaseCertificateById(req.user.companyId, id);
  }

  @Post("release-certificates")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Create release certificate" })
  async createReleaseCertificate(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: any,
  ) {
    return this.qcService.createReleaseCertificate(req.user.companyId, jobCardId, body, req.user);
  }

  @Patch("release-certificates/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Update release certificate" })
  async updateReleaseCertificate(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.qcService.updateReleaseCertificate(req.user.companyId, id, body);
  }

  @Delete("release-certificates/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete release certificate" })
  async deleteReleaseCertificate(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteReleaseCertificate(req.user.companyId, id);
    return { deleted: true };
  }

  // ── Items Release ──────────────────────────────────────────────────

  @Get("items-releases")
  @ApiOperation({ summary: "Items releases for a job card" })
  async itemsReleasesList(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.itemsReleasesForJobCard(req.user.companyId, jobCardId);
  }

  @Get("items-releases/:id/pdf")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Download items release as PDF" })
  async downloadItemsReleasePdf(
    @Req() req: any,
    @Res() res: Response,
    @Param("jobCardId") jobCardId: number,
    @Param("id") id: number,
  ) {
    const buffer = await this.dataBookPdfService.generateItemsReleasePdf(
      req.user.companyId,
      jobCardId,
      id,
    );

    if (!buffer) {
      throw new NotFoundException("Items release not found");
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="QD_PLS_09_Items_Release_${id}.pdf"`,
      "Content-Length": buffer.length.toString(),
    });
    res.end(buffer);
  }

  @Get("items-releases/:id")
  @ApiOperation({ summary: "Single items release" })
  async itemsReleaseById(@Req() req: any, @Param("id") id: number) {
    return this.qcService.itemsReleaseById(req.user.companyId, id);
  }

  @Post("items-releases")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Create items release" })
  async createItemsRelease(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: any,
  ) {
    return this.qcService.createItemsRelease(req.user.companyId, jobCardId, body, req.user);
  }

  @Post("items-releases/auto-populate")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Auto-populate items release from job card line items" })
  async autoPopulateItemsRelease(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.autoPopulateItemsRelease(req.user.companyId, jobCardId, req.user);
  }

  @Post("release-documents/auto-generate")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Auto-generate items release + release certificate from QC data" })
  async autoGenerateReleaseDocuments(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: { selectedItemIndices: number[]; quantityOverrides?: Record<string, number> },
  ) {
    return this.qcService.autoGenerateReleaseDocuments(
      req.user.companyId,
      jobCardId,
      body.selectedItemIndices,
      req.user,
      body.quantityOverrides,
    );
  }

  @Patch("items-releases/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Update items release" })
  async updateItemsRelease(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.qcService.updateItemsRelease(req.user.companyId, id, body);
  }

  @Delete("items-releases/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete items release" })
  async deleteItemsRelease(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteItemsRelease(req.user.companyId, id);
    return { deleted: true };
  }

  // ── QCP Approval Workflow ─────────────────────────────────────

  @Post("control-plans/:id/send-for-approval")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Send control plan for client approval via email" })
  async sendForApproval(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: { clientEmail: string },
  ) {
    return this.approvalService.sendForClientApproval(
      req.user.companyId,
      id,
      body.clientEmail,
      req.user,
    );
  }

  @Post("control-plans/:id/cancel-approval")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Cancel pending QCP approval" })
  async cancelApproval(@Req() req: any, @Param("id") id: number) {
    return this.approvalService.cancelApproval(req.user.companyId, id);
  }

  @Post("control-plans/:id/resend-approval")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Resend QCP approval email" })
  async resendApproval(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: { partyRole: "mps" | "client" | "third_party" },
  ) {
    return this.approvalService.resendApproval(req.user.companyId, id, body.partyRole, req.user);
  }

  @Get("control-plans/:id/approval-history")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Approval token history for a control plan" })
  async approvalHistory(@Req() req: any, @Param("id") id: number) {
    return this.approvalService.approvalHistory(req.user.companyId, id);
  }

  @Get("customer-qcp-preferences/:customerName")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Remembered email and intervention defaults for a customer" })
  async customerPreferences(@Req() req: any, @Param("customerName") customerName: string) {
    return this.approvalService.clientPreferences(
      req.user.companyId,
      decodeURIComponent(customerName),
    );
  }

  // ── Environmental Records ────────────────────────────────────────

  @Get("environmental-records")
  @ApiOperation({ summary: "Environmental records for a job card" })
  async environmentalRecordsList(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.environmentalRecordsForJobCard(req.user.companyId, jobCardId);
  }

  @Get("environmental-records/by-date")
  @ApiOperation({ summary: "Environmental record for a specific date" })
  async environmentalRecordByDate(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Query("date") date: string,
  ) {
    const record = await this.qcService.environmentalRecordByDate(
      req.user.companyId,
      jobCardId,
      date,
    );
    return record || null;
  }

  @Post("environmental-records")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Create environmental record" })
  async createEnvironmentalRecord(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: any,
  ) {
    return this.qcService.createEnvironmentalRecord(req.user.companyId, jobCardId, body, req.user);
  }

  @Post("environmental-records/bulk")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Bulk create/upsert environmental records (CSV upload)" })
  async bulkCreateEnvironmentalRecords(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: { records: any[] },
  ) {
    return this.qcService.bulkCreateEnvironmentalRecords(
      req.user.companyId,
      jobCardId,
      body.records,
      req.user,
    );
  }

  @Patch("environmental-records/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Update environmental record" })
  async updateEnvironmentalRecord(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.qcService.updateEnvironmentalRecord(req.user.companyId, id, body);
  }

  @Delete("environmental-records/:id")
  @StockControlRoles("quality", "manager", "admin")
  @PermissionKey("qc.measurements")
  @ApiOperation({ summary: "Delete environmental record" })
  async deleteEnvironmentalRecord(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteEnvironmentalRecord(req.user.companyId, id);
    return { deleted: true };
  }

  // ── Defelsko Batches ──────────────────────────────────────────────

  @Get("defelsko-batches")
  @ApiOperation({ summary: "Defelsko batch numbers for a job card" })
  async defelskoBatchesList(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.qcService.defelskoBatchesForJobCard(req.user.companyId, jobCardId);
  }

  @Post("defelsko-batches")
  @ApiOperation({ summary: "Save defelsko batch numbers (upsert)" })
  async saveDefelskoBatches(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: any,
  ) {
    const saved = await this.qcService.saveDefelskoBatches(
      req.user.companyId,
      jobCardId,
      body,
      req.user,
    );

    const materialCategories = new Set(["material_paint", "material_rubber"]);
    const materialBatches = (body.batches || []).filter(
      (b: { category: string; batchNumber: string | null }) =>
        materialCategories.has(b.category) && b.batchNumber,
    );

    materialBatches.forEach((entry: { fieldKey: string; batchNumber: string }) => {
      this.certificateService
        .linkMaterialBatchToCertificate(
          req.user.companyId,
          jobCardId,
          entry.fieldKey,
          entry.batchNumber,
        )
        .catch((err: Error) =>
          this.logger.warn(`Auto-link cert for field ${entry.fieldKey} failed: ${err.message}`),
        );
    });

    const batchesWithNumbers = (body.batches || []).filter(
      (b: { batchNumber: string | null }) => b.batchNumber,
    );
    batchesWithNumbers.forEach((entry: { fieldKey: string; batchNumber: string }) => {
      this.positectorUploadService
        .retroactiveMatch(
          req.user.companyId,
          jobCardId,
          entry.batchNumber,
          entry.fieldKey,
          req.user,
        )
        .then((results) => {
          if (results.length > 0) {
            this.logger.log(
              `Retroactively imported ${results.length} PosiTector upload(s) for JC ${jobCardId}, batch "${entry.batchNumber}"`,
            );
          }
        })
        .catch((err: Error) =>
          this.logger.warn(
            `Retroactive PosiTector match for batch "${entry.batchNumber}" failed: ${err.message}`,
          ),
        );
    });

    return saved;
  }
}
