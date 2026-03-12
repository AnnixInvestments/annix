import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import { ILike, MoreThan, Repository } from "typeorm";
import { formatDateTime } from "../../lib/datetime";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import type { RubberPlanManualRoll } from "../entities/job-card.entity";
import { JobCard } from "../entities/job-card.entity";
import {
  ApprovalStatus,
  JobCardApproval,
  WorkflowStep,
} from "../entities/job-card-approval.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockItem } from "../entities/stock-item.entity";
import {
  type BandSpec,
  type CutPiece,
  type CuttingPlan,
  calculateCuttingPlan,
  parsePipeItem,
  parseRubberSpecNote,
  type RollAllocation,
} from "../lib/rubberCuttingCalculator";
import { WorkflowStepConfigService } from "./workflow-step-config.service";

@Injectable()
export class JobCardPdfService {
  private readonly logger = new Logger(JobCardPdfService.name);

  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardApproval)
    private readonly approvalRepo: Repository<JobCardApproval>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingAnalysisRepo: Repository<JobCardCoatingAnalysis>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    private readonly configService: ConfigService,
    private readonly stepConfigService: WorkflowStepConfigService,
  ) {}

  async generatePrintableJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
      relations: ["allocations", "allocations.stockItem", "lineItems"],
    });

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });

    const approvals = await this.approvalRepo.find({
      where: { jobCardId, companyId },
      order: { createdAt: "ASC" },
    });

    const coatingAnalysis = await this.coatingAnalysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    this.logger.log(
      `PDF for job card ${jobCardId}: coatingAnalysis=${coatingAnalysis ? "found" : "null"}, coats=${coatingAnalysis?.coats ? coatingAnalysis.coats.length : "none"}`,
    );
    if (coatingAnalysis?.coats) {
      this.logger.log(`Coats data: ${JSON.stringify(coatingAnalysis.coats)}`);
    }

    const stepConfigs = await this.stepConfigService.orderedSteps(companyId);

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const qrUrl = `${frontendUrl}/stock-control/portal/job-cards/${jobCardId}/dispatch`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1 });

    const buffer = await this.createPdf(
      jobCard,
      company,
      approvals,
      coatingAnalysis,
      qrDataUrl,
      stepConfigs,
    );
    const filename = `JC-${jobCard.jobNumber}-${jobCard.id}.pdf`;

    return { buffer, filename };
  }

  private async createPdf(
    jobCard: JobCard,
    company: StockControlCompany | null,
    approvals: JobCardApproval[],
    coatingAnalysis: JobCardCoatingAnalysis | null,
    qrDataUrl: string,
    stepConfigs: { key: string; label: string }[] = [],
  ): Promise<Buffer> {
    const rubberAllocationResult = await this.prepareRubberAllocation(jobCard);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const { filteredItems: pipeItems, noteItems } = this.partitionLineItems(jobCard.lineItems);
      const totalPipeQty = pipeItems.reduce(
        (sum, li) => sum + (li.quantity ? Number(li.quantity) : 0),
        0,
      );

      this.drawHeader(doc, company, jobCard);
      const detailsEndY = this.drawJobCardDetails(doc, jobCard, noteItems);
      this.drawQrCode(doc, qrDataUrl);

      let currentY = Math.max(280, detailsEndY);
      currentY = this.drawLineItems(doc, jobCard, currentY);
      currentY = this.drawRubberAllocationSync(doc, jobCard, rubberAllocationResult, currentY);
      currentY = this.drawCoatingSpecification(
        doc,
        coatingAnalysis,
        currentY,
        company,
        totalPipeQty,
      );
      currentY = this.drawAllocations(doc, jobCard, currentY);
      currentY = this.drawSignatureBoxes(doc, approvals, currentY, stepConfigs);
      this.drawFooter(doc);

      doc.end();
    });
  }

  private drawHeader(
    doc: typeof PDFDocument,
    company: StockControlCompany | null,
    jobCard: JobCard,
  ): void {
    const companyName = company?.name || "Stock Control";

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(companyName, 50, 50, { align: "left" })
      .fontSize(14)
      .font("Helvetica")
      .text("JOB CARD", 50, 75, { align: "left" });

    doc.fontSize(24).font("Helvetica-Bold").text(jobCard.jobNumber, 400, 50, { align: "right" });

    if (jobCard.jcNumber) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`JC: ${jobCard.jcNumber}`, 400, 80, { align: "right" });
    }

    doc.moveTo(50, 100).lineTo(545, 100).stroke();
  }

  private drawJobCardDetails(
    doc: typeof PDFDocument,
    jobCard: JobCard,
    noteItems: JobCard["lineItems"],
  ): number {
    let y = 115;
    const leftCol = 50;
    const rightCol = 300;

    doc.fontSize(10).font("Helvetica-Bold");

    const details = [
      { label: "Job Name:", value: jobCard.jobName, col: leftCol },
      {
        label: "Status:",
        value: jobCard.workflowStatus.replace(/_/g, " ").toUpperCase(),
        col: rightCol,
      },
      { label: "Customer:", value: jobCard.customerName || "-", col: leftCol },
      { label: "Due Date:", value: jobCard.dueDate || "-", col: rightCol },
      { label: "Site Location:", value: jobCard.siteLocation || "-", col: leftCol },
      { label: "PO Number:", value: jobCard.poNumber || "-", col: rightCol },
      { label: "Contact Person:", value: jobCard.contactPerson || "-", col: leftCol },
      { label: "Reference:", value: jobCard.reference || "-", col: rightCol },
    ];

    details.forEach((item, index) => {
      const row = Math.floor(index / 2);
      const currentY = y + row * 20;

      doc.font("Helvetica-Bold").text(item.label, item.col, currentY, { continued: true });
      doc.font("Helvetica").text(` ${item.value}`);
    });

    y += Math.ceil(details.length / 2) * 20;

    if (jobCard.description) {
      y += 10;
      doc
        .font("Helvetica-Bold")
        .text("Description:", leftCol, y)
        .font("Helvetica")
        .text(jobCard.description, leftCol, y + 15, { width: 495 });
      const descLines = Math.ceil(jobCard.description.length / 80);
      y += 15 + descLines * 12;
    }

    const nonRubberNotes = (noteItems || [])
      .map((item) => (item.itemCode || "").trim())
      .filter(
        (text) => text && !/^r\/l\b/i.test(text) && !/rubber\s+(lining|sheet|lagging)/i.test(text),
      );
    const combinedNotes = [jobCard.notes, ...nonRubberNotes].filter(Boolean).join("\n\n");

    if (combinedNotes) {
      y += 10;
      doc.font("Helvetica-Bold").text("Notes:", leftCol, y);
      y += 15;
      doc.font("Helvetica").text(combinedNotes, leftCol, y, { width: 495 });
      const noteLines = combinedNotes
        .split("\n")
        .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 80)), 0);
      y += noteLines * 12;
    }

    return y + 10;
  }

  private drawQrCode(doc: typeof PDFDocument, qrDataUrl: string): void {
    const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
    doc.image(qrBuffer, 450, 115, { width: 90, height: 90 });

    doc
      .fontSize(8)
      .font("Helvetica")
      .text("Scan to dispatch", 450, 210, { width: 90, align: "center" });
  }

  private drawLineItems(doc: typeof PDFDocument, jobCard: JobCard, startY: number): number {
    if (!jobCard.lineItems || jobCard.lineItems.length === 0) {
      return startY;
    }

    doc
      .moveTo(50, startY - 10)
      .lineTo(545, startY - 10)
      .stroke();

    doc.fontSize(12).font("Helvetica-Bold").text("Line Items", 50, startY);

    let y = startY + 20;

    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("#", 50, y, { width: 20 });
    doc.text("Item Code", 70, y);
    doc.text("Qty", 470, y);
    doc.text("JT No", 510, y);

    y += 15;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 5;

    doc.font("Helvetica").fontSize(8);
    const { filteredItems } = this.partitionLineItems(jobCard.lineItems);
    filteredItems.slice(0, 15).forEach((item, index) => {
      const itemCode = item.itemCode || "-";
      const description = item.itemDescription || "";
      const label = description ? `${itemCode} - ${description}` : itemCode;

      doc.text(String(index + 1), 50, y, { width: 20 });
      doc.text(label, 70, y, { width: 395 });
      doc.text(String(item.quantity || "-"), 470, y);
      doc.text(item.jtNo || "-", 510, y);
      y += 15;

      if (item.notes) {
        doc.fontSize(7).fillColor("#0d9488").font("Helvetica-Oblique");
        doc.text(item.notes, 70, y, { width: 395 });
        const noteLines = item.notes.split("\n").length;
        y += noteLines * 10;
        doc.fontSize(8).fillColor("black").font("Helvetica");
      }
    });

    if (filteredItems.length > 15) {
      doc.text(`... and ${filteredItems.length - 15} more items`, 50, y);
      y += 15;
    }

    return y + 10;
  }

  private drawCoatingSpecification(
    doc: typeof PDFDocument,
    coatingAnalysis: JobCardCoatingAnalysis | null,
    startY: number,
    company: StockControlCompany | null = null,
    totalPipeQty: number = 0,
  ): number {
    if (!coatingAnalysis || !coatingAnalysis.coats || coatingAnalysis.coats.length === 0) {
      return startY;
    }
    doc
      .moveTo(50, startY - 10)
      .lineTo(545, startY - 10)
      .stroke();

    doc.fontSize(12).font("Helvetica-Bold").text("Coating Specification", 50, startY);

    let y = startY + 15;
    doc.fontSize(9).font("Helvetica");

    const areaInfo: string[] = [];
    if (coatingAnalysis.extM2 > 0) {
      areaInfo.push(`Ext: ${Number(coatingAnalysis.extM2).toFixed(2)} m²`);
    }
    if (coatingAnalysis.intM2 > 0) {
      areaInfo.push(`Int: ${Number(coatingAnalysis.intM2).toFixed(2)} m²`);
    }
    if (areaInfo.length > 0) {
      doc.text(`Surface Area: ${areaInfo.join(", ")}`, 50, y);
      y += 15;
    }

    y += 5;
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Product", 50, y);
    doc.text("DFT (µm)", 260, y);
    doc.text("Coverage (m²/L)", 330, y);
    doc.text("Allowed Litres", 420, y);
    doc.text("L/Pipe", 500, y);

    y += 15;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 5;

    doc.font("Helvetica").fontSize(8);
    coatingAnalysis.coats.forEach((coat) => {
      const dftRange =
        coat.minDftUm === coat.maxDftUm
          ? String(coat.minDftUm)
          : `${coat.minDftUm}-${coat.maxDftUm}`;

      const litresPerPipe =
        totalPipeQty > 0 && coat.litersRequired > 0 ? coat.litersRequired / totalPipeQty : 0;

      doc.text(coat.product, 50, y, { width: 200 });
      doc.text(dftRange, 260, y);
      doc.text(String(coat.coverageM2PerLiter.toFixed(2)), 330, y);
      doc.text(coat.litersRequired === 0 ? "—" : String(coat.litersRequired.toFixed(1)), 420, y);
      doc.text(litresPerPipe === 0 ? "—" : litresPerPipe.toFixed(2), 500, y);
      y += 15;
    });

    const lossPct = company?.pipingLossFactorPct ?? 45;
    doc.fillColor("#999999").fontSize(7).font("Helvetica");
    doc.text(`Coverage includes ${lossPct}% piping loss factor`, 50, y);
    y += 12;

    return y + 10;
  }

  private async prepareRubberAllocation(jobCard: JobCard): Promise<{
    plan: CuttingPlan;
    stockRolls: {
      thicknessMm: number;
      widthMm: number;
      lengthM: number;
      quantityAvailable: number;
    }[];
    isRubberJob: boolean;
    totalM2: number;
  }> {
    const allText = [
      jobCard.notes || "",
      ...(jobCard.lineItems || []).map(
        (li) => `${li.itemCode || ""} ${li.itemDescription || ""} ${li.notes || ""}`,
      ),
    ]
      .join(" ")
      .toLowerCase();

    const isRubberJob =
      allText.includes("rubber") ||
      allText.includes("r/l") ||
      allText.includes("lining") ||
      allText.includes("liner") ||
      allText.includes("lagging");

    const totalM2 = (jobCard.lineItems || []).reduce(
      (sum, li) => sum + (li.m2 ? Number(li.m2) : 0),
      0,
    );

    if (!isRubberJob) {
      const emptyPlan = calculateCuttingPlan([]);
      return { plan: emptyPlan, stockRolls: [], isRubberJob: false, totalM2 };
    }

    const { filteredItems } = this.partitionLineItems(jobCard.lineItems);

    const rubberStock = await this.stockItemRepo.find({
      where: {
        companyId: jobCard.companyId,
        category: ILike("%rubber%"),
        quantity: MoreThan(0),
      },
    });

    const stockRolls = rubberStock
      .filter((s) => s.thicknessMm !== null)
      .map((s) => ({
        stockItemId: s.id,
        thicknessMm: Number(s.thicknessMm),
        widthMm: s.widthMm ? Number(s.widthMm) : 0,
        lengthM: s.lengthM ? Number(s.lengthM) : 0,
        color: s.color,
        compoundCode: s.compoundCode,
        quantityAvailable: s.quantity,
      }));

    const stockQuery = {
      availableThicknesses: [...new Set(stockRolls.map((s) => s.thicknessMm))],
      rolls: stockRolls,
    };

    const calcItems = filteredItems.map((li) => ({
      id: li.id,
      itemCode: li.itemCode,
      itemDescription: li.itemDescription,
      itemNo: li.itemNo,
      quantity: li.quantity,
      m2: li.m2,
      notes: li.notes,
    }));

    calcItems.forEach((item, idx) => {
      const desc = item.itemDescription || item.itemCode || "";
      const parsed = parsePipeItem(
        String(item.id),
        desc,
        Number(item.quantity || 1),
        item.m2 ? Number(item.m2) : null,
        item.itemNo || null,
      );
      this.logger.log(
        `Rubber PDF JC ${jobCard.id} item[${idx}]: desc="${desc}" qty=${item.quantity} m2=${item.m2} ` +
          `→ nb=${parsed.nbMm} len=${parsed.lengthMm} w=${parsed.rubberWidthMm} l=${parsed.rubberLengthMm} valid=${parsed.isValidPipe}`,
      );
    });

    const selectedPly = jobCard.rubberPlanOverride?.selectedPlyCombination || null;
    this.logger.log(
      `Rubber PDF JC ${jobCard.id}: override=${JSON.stringify(jobCard.rubberPlanOverride?.status)}, ` +
        `selectedPly=${JSON.stringify(selectedPly)}, stockRolls=${stockRolls.length}`,
    );

    const plan = calculateCuttingPlan(
      calcItems,
      stockRolls.length > 0 ? stockQuery : null,
      selectedPly,
    );

    if (!plan.rubberSpec) {
      const allNotes = [
        jobCard.notes || "",
        ...(jobCard.lineItems || []).map((li) => li.notes || ""),
      ].filter(Boolean);

      for (const noteText of allNotes) {
        const specFromNotes = parseRubberSpecNote(noteText);
        if (specFromNotes) {
          plan.rubberSpec = specFromNotes;
          plan.totalThicknessMm = specFromNotes.thicknessMm;
          break;
        }
      }
    }

    this.logger.log(
      `Rubber PDF JC ${jobCard.id}: hasPipeItems=${plan.hasPipeItems}, ` +
        `rolls=${plan.rolls.length}, totalUsed=${plan.totalUsedSqM.toFixed(2)}m², ` +
        `genericM2=${plan.genericM2Total.toFixed(2)}, rubberSpec=${JSON.stringify(plan.rubberSpec)}`,
    );

    return { plan, stockRolls, isRubberJob: true, totalM2 };
  }

  private drawRubberAllocationSync(
    doc: typeof PDFDocument,
    jobCard: JobCard,
    rubberData: {
      plan: CuttingPlan;
      stockRolls: {
        thicknessMm: number;
        widthMm: number;
        lengthM: number;
        quantityAvailable: number;
      }[];
      isRubberJob: boolean;
      totalM2: number;
    },
    startY: number,
  ): number {
    const { plan, stockRolls, isRubberJob, totalM2 } = rubberData;

    if (!isRubberJob) return startY;
    if (totalM2 <= 0 && !plan.hasPipeItems) return startY;

    const manualOverride = jobCard.rubberPlanOverride;
    const hasAcceptedPlan =
      manualOverride?.status === "accepted" || manualOverride?.status === "manual";
    if (!hasAcceptedPlan) return startY;

    doc
      .moveTo(50, startY - 10)
      .lineTo(545, startY - 10)
      .stroke();

    doc.fontSize(12).font("Helvetica-Bold").text("Rubber Allocation", 50, startY);

    let y = startY + 15;

    if (plan.rubberSpec) {
      doc.fontSize(8).font("Helvetica");
      const specParts = [
        `${plan.rubberSpec.thicknessMm}mm`,
        plan.rubberSpec.shore ? `${plan.rubberSpec.shore} Shore` : null,
        plan.rubberSpec.color,
        plan.rubberSpec.compound,
        plan.rubberSpec.pattern,
      ].filter(Boolean);
      doc.text(`Spec: ${specParts.join(" / ")}`, 50, y);
      y += 12;
    }

    if (
      manualOverride?.status === "manual" &&
      manualOverride.manualRolls &&
      manualOverride.manualRolls.length > 0
    ) {
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("MANUAL CUTTING PLAN (Manager Override)", 50, y);
      y += 14;

      if (manualOverride.reviewedBy) {
        doc.fontSize(7).font("Helvetica");
        doc.text(
          `Reviewed by: ${manualOverride.reviewedBy}  ${manualOverride.reviewedAt || ""}`,
          50,
          y,
        );
        y += 10;
      }

      const manualRollAllocations = manualOverride.manualRolls.map((mRoll, rollIdx) =>
        this.manualRollToAllocation(mRoll, rollIdx),
      );

      manualRollAllocations.forEach((rollAlloc) => {
        const diagramHeight = this.cuttingDiagramHeight(rollAlloc);
        const pageHeight = doc.page.height;
        if (y + diagramHeight > pageHeight - 60) {
          doc.addPage();
          y = 50;
        }
        y = this.drawCuttingDiagramForRoll(doc, rollAlloc, y, 1, rollAlloc.plyThicknessMm);
      });

      if (plan.genericM2Total > 0) {
        doc.fontSize(8).font("Helvetica");
        doc.text(`Plus generic m² items: ${plan.genericM2Total.toFixed(2)} m²`, 50, y);
        y += 12;
      }
    } else if (plan.hasPipeItems) {
      if (manualOverride?.status === "accepted") {
        doc.fontSize(8).font("Helvetica-Bold").fillColor("#166534");
        doc.text("ACCEPTED BY MANAGER", 50, y);
        doc.fillColor("#000000");
        y += 12;
      }

      doc.fontSize(9).font("Helvetica-Bold");
      doc.text(`Rolls Required: ${plan.totalRollsNeeded}`, 50, y);
      doc.text(`Used: ${plan.totalUsedSqM.toFixed(2)} m²`, 200, y);
      doc.text(
        `Waste: ${plan.totalWasteSqM.toFixed(2)} m² (${plan.wastePercentage.toFixed(1)}%)`,
        340,
        y,
      );
      y += 15;

      if (plan.genericM2Total > 0) {
        doc.fontSize(8).font("Helvetica");
        doc.text(`Plus generic m² items: ${plan.genericM2Total.toFixed(2)} m²`, 50, y);
        y += 12;
      }

      y += 5;

      if (plan.isMultiPly && plan.plies.length > 1) {
        plan.plies.forEach((ply, plyIdx) => {
          const plyStock = stockRolls.filter((r) => r.thicknessMm === ply.thicknessMm);
          const totalAvailable = plyStock.reduce((s, r) => s + r.quantityAvailable, 0);
          const sohLabel =
            totalAvailable >= ply.totalRollsNeeded
              ? "IN STOCK"
              : totalAvailable > 0
                ? "PARTIAL"
                : "TO ORDER";

          const pageHeight = doc.page.height;
          if (y + 20 > pageHeight - 60) {
            doc.addPage();
            y = 50;
          }

          doc.fontSize(9).font("Helvetica-Bold");
          doc.text(
            `Ply ${plyIdx + 1}: ${ply.thicknessMm}mm (${ply.totalRollsNeeded} rolls) — ${sohLabel}`,
            50,
            y,
          );
          y += 14;

          this.groupIdenticalRolls(ply.rolls).forEach((group) => {
            const diagramHeight = this.cuttingDiagramHeight(group.roll);
            if (y + diagramHeight > pageHeight - 60) {
              doc.addPage();
              y = 50;
            }
            y = this.drawCuttingDiagramForRoll(doc, group.roll, y, group.count, ply.thicknessMm);
          });
        });
      } else {
        const singlePly = plan.plies[0];
        if (singlePly && singlePly.thicknessMm > 0) {
          const plyStock = stockRolls.filter((r) => r.thicknessMm === singlePly.thicknessMm);
          const totalAvailable = plyStock.reduce((s, r) => s + r.quantityAvailable, 0);
          const sohLabel =
            totalAvailable >= singlePly.totalRollsNeeded
              ? "IN STOCK"
              : totalAvailable > 0
                ? "PARTIAL"
                : "TO ORDER";
          doc.fontSize(8).font("Helvetica");
          doc.text(`${singlePly.thicknessMm}mm — ${sohLabel} (${totalAvailable} available)`, 50, y);
          y += 12;
        }

        this.groupIdenticalRolls(plan.rolls).forEach((group) => {
          const diagramHeight = this.cuttingDiagramHeight(group.roll);
          const pageHeight = doc.page.height;
          if (y + diagramHeight > pageHeight - 60) {
            doc.addPage();
            y = 50;
          }
          y = this.drawCuttingDiagramForRoll(
            doc,
            group.roll,
            y,
            group.count,
            group.roll.plyThicknessMm || plan.totalThicknessMm || undefined,
          );
        });
      }
    } else {
      const retryPlan = calculateCuttingPlan(
        (jobCard.lineItems || []).map((li) => ({
          id: li.id,
          itemCode: li.itemCode,
          itemDescription: li.itemDescription,
          itemNo: li.itemNo,
          quantity: li.quantity,
          m2: li.m2,
        })),
      );

      if (retryPlan.hasPipeItems) {
        this.logger.log(
          `Rubber PDF fallback recalc succeeded: rolls=${retryPlan.totalRollsNeeded}, used=${retryPlan.totalUsedSqM.toFixed(2)}m²`,
        );

        doc.fontSize(9).font("Helvetica-Bold");
        doc.text(`Rolls Required: ${retryPlan.totalRollsNeeded}`, 50, y);
        doc.text(`Used: ${retryPlan.totalUsedSqM.toFixed(2)} m²`, 200, y);
        doc.text(
          `Waste: ${retryPlan.totalWasteSqM.toFixed(2)} m² (${retryPlan.wastePercentage.toFixed(1)}%)`,
          340,
          y,
        );
        y += 15;

        if (retryPlan.genericM2Total > 0) {
          doc.fontSize(8).font("Helvetica");
          doc.text(`Plus generic m² items: ${retryPlan.genericM2Total.toFixed(2)} m²`, 50, y);
          y += 12;
        }

        this.groupIdenticalRolls(retryPlan.rolls).forEach((group) => {
          const diagramHeight = this.cuttingDiagramHeight(group.roll);
          const pageHeight = doc.page.height;
          if (y + diagramHeight > pageHeight - 60) {
            doc.addPage();
            y = 50;
          }
          y = this.drawCuttingDiagramForRoll(
            doc,
            group.roll,
            y,
            group.count,
            group.roll.plyThicknessMm || retryPlan.totalThicknessMm || undefined,
          );
        });
      } else {
        const manualRolls = jobCard.rubberPlanOverride?.manualRolls;
        const firstStockRoll = stockRolls.find((r) => r.widthMm > 0 && r.lengthM > 0);
        const rollWidthMm =
          manualRolls && manualRolls.length > 0
            ? manualRolls[0].widthMm
            : firstStockRoll
              ? firstStockRoll.widthMm
              : 1200;
        const rollLengthM =
          manualRolls && manualRolls.length > 0
            ? manualRolls[0].lengthM
            : firstStockRoll
              ? firstStockRoll.lengthM
              : 12.5;
        const rollAreaM2 = (rollWidthMm / 1000) * rollLengthM;
        const rollsNeeded = Math.ceil(totalM2 / rollAreaM2);
        const lastRollUsage = totalM2 - (rollsNeeded - 1) * rollAreaM2;
        const lastRollPercent = Math.round((lastRollUsage / rollAreaM2) * 100);
        const leftover = rollsNeeded * rollAreaM2 - totalM2;

        doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            `Standard work rolls: ${rollWidthMm}mm x ${rollLengthM}m = ${rollAreaM2.toFixed(2)} m² per roll`,
            50,
            y,
          );

        y += 15;
        doc.fontSize(9).font("Helvetica-Bold");
        doc.text(`Total Required: ${totalM2.toFixed(2)} m²`, 50, y);
        doc.text(`Rolls Required: ${rollsNeeded}`, 200, y);
        doc.text(`Last Roll Usage: ${lastRollPercent}%`, 320, y);
        doc.text(`Leftover: ${leftover.toFixed(2)} m²`, 450, y);

        y += 15;
        const itemsWithM2 = (jobCard.lineItems || []).filter(
          (li) => li.m2 !== null && Number(li.m2) > 0,
        );
        if (itemsWithM2.length > 0) {
          doc.fontSize(8).font("Helvetica");
          itemsWithM2.forEach((li) => {
            const label = li.itemDescription
              ? `${li.itemCode || ""} - ${li.itemDescription}`
              : li.itemCode || "-";
            const qty = li.quantity ? `× ${li.quantity}` : "";
            doc.text(`${label} ${qty}`.trim(), 60, y, { width: 380 });
            doc.text(`${Number(li.m2).toFixed(2)} m²`, 450, y);
            y += 12;
          });
        }
      }
    }

    return y + 10;
  }

  private cuttingDiagramHeight(roll: RollAllocation): number {
    const rollRectHeight = 48;
    const headerHeight = 15;
    const cutListHeight = roll.cuts.length * 10 + 5;
    const offcutHeight = roll.offcuts.length > 0 ? roll.offcuts.length * 8 + 10 : 0;
    return headerHeight + rollRectHeight + cutListHeight + offcutHeight + 15;
  }

  private groupIdenticalRolls(rolls: RollAllocation[]): { roll: RollAllocation; count: number }[] {
    const groups: { roll: RollAllocation; count: number }[] = [];
    const seen = new Map<string, number>();

    rolls.forEach((roll) => {
      const specKey = `${roll.rollSpec.widthMm}-${roll.rollSpec.lengthM}`;
      const bandsKey = roll.bands.map((b) => `${b.lanes}:${b.laneWidthMm}:${b.heightMm}`).join("|");
      const cutsKey = roll.cuts
        .map((c) => `${c.widthMm}:${c.lengthMm}:${c.band}:${c.lane}`)
        .sort()
        .join("|");
      const key = `${specKey}/${bandsKey}/${cutsKey}`;
      const existingIdx = seen.get(key);

      if (existingIdx !== undefined) {
        groups[existingIdx] = { ...groups[existingIdx], count: groups[existingIdx].count + 1 };
      } else {
        seen.set(key, groups.length);
        groups.push({ roll, count: 1 });
      }
    });

    return groups;
  }

  private manualRollToAllocation(mRoll: RubberPlanManualRoll, rollIndex: number): RollAllocation {
    const rollLengthMm = mRoll.lengthM * 1000;
    const rollWidthMm = mRoll.widthMm;

    const cuts: CutPiece[] = [];
    const bands: BandSpec[] = [];
    let positionMm = 0;
    let bandIndex = 0;
    let currentBandLaneWidth = 0;
    let currentBandStart = 0;
    let lane = 0;

    const sortedCuts = [...mRoll.cuts].sort((a, b) => b.widthMm - a.widthMm);

    sortedCuts.forEach((cut) => {
      if (cut.widthMm !== currentBandLaneWidth && cuts.length > 0) {
        bands.push({
          bandIndex: bandIndex,
          lanes: 1,
          laneWidthMm: currentBandLaneWidth,
          startMm: currentBandStart,
          heightMm: currentBandLaneWidth,
          widthUsedMm: positionMm - currentBandStart,
        });
        bandIndex++;
        currentBandStart = positionMm;
        lane = 0;
      }
      currentBandLaneWidth = cut.widthMm;

      Array.from({ length: cut.quantity }).forEach(() => {
        cuts.push({
          itemId: cut.description,
          itemNo: cut.description,
          description: cut.description,
          widthMm: cut.widthMm,
          lengthMm: cut.lengthMm,
          positionMm,
          lane,
          band: bandIndex,
          stripsPerPiece: 1,
        });
        positionMm += cut.lengthMm;
      });
    });

    if (currentBandLaneWidth > 0) {
      bands.push({
        bandIndex: bandIndex,
        lanes: 1,
        laneWidthMm: currentBandLaneWidth,
        startMm: currentBandStart,
        heightMm: currentBandLaneWidth,
        widthUsedMm: positionMm - currentBandStart,
      });
    }

    if (bands.length === 0) {
      bands.push({
        bandIndex: 0,
        lanes: 1,
        laneWidthMm: rollWidthMm,
        startMm: 0,
        heightMm: rollWidthMm,
        widthUsedMm: 0,
      });
    }

    const totalUsedMm = cuts.reduce((sum, c) => sum + c.lengthMm, 0);
    const wastePercentage =
      rollLengthMm > 0 ? ((rollLengthMm - totalUsedMm) / rollLengthMm) * 100 : 0;

    return {
      rollIndex: rollIndex + 1,
      rollSpec: {
        widthMm: rollWidthMm,
        lengthM: mRoll.lengthM,
        areaSqM: (rollWidthMm / 1000) * mRoll.lengthM,
        lanes: 1,
        laneWidthMm: rollWidthMm,
      },
      cuts,
      usedLengthMm: [totalUsedMm],
      wastePercentage: Math.max(0, wastePercentage),
      hasLengthwiseCut: false,
      bands,
      offcuts: [],
      plyThicknessMm: mRoll.thicknessMm,
    };
  }

  private drawCuttingDiagramForRoll(
    doc: typeof PDFDocument,
    roll: RollAllocation,
    startY: number,
    groupCount?: number,
    thicknessMm?: number,
  ): number {
    const COLORS = [
      "#3B82F6",
      "#14B8A6",
      "#8B5CF6",
      "#F97316",
      "#EC4899",
      "#6366F1",
      "#06B6D4",
      "#10B981",
    ];
    const leftMargin = 50;
    const diagramWidth = 495;
    const bands = roll.bands;
    const rollRectHeight = 48;
    const rollLengthMm = roll.rollSpec.lengthM * 1000;
    const scale = diagramWidth / rollLengthMm;
    const totalBandHeight = bands.reduce((sum, b) => sum + b.heightMm, 0);

    let y = startY;

    doc.fontSize(8).font("Helvetica-Bold");
    const thicknessPrefix = thicknessMm ? `${thicknessMm}mm ` : "";
    const rollLabel =
      groupCount && groupCount > 1
        ? `${thicknessPrefix}${roll.rollSpec.widthMm}mm × ${roll.rollSpec.lengthM}m — ${groupCount} rolls`
        : `Roll ${roll.rollIndex}: ${thicknessPrefix}${roll.rollSpec.widthMm}mm × ${roll.rollSpec.lengthM}m`;
    doc.text(
      rollLabel +
        (bands.length > 1 ? ` (${bands.length} bands)` : "") +
        ` — Waste: ${roll.wastePercentage.toFixed(1)}%`,
      leftMargin,
      y,
    );
    y += 14;

    doc.save();
    doc.rect(leftMargin, y, diagramWidth, rollRectHeight).lineWidth(0.5).stroke();

    const colorMap = new Map<string, string>();
    let colorIdx = 0;

    roll.cuts.forEach((cut) => {
      if (!colorMap.has(cut.itemId)) {
        colorMap.set(cut.itemId, COLORS[colorIdx % COLORS.length]);
        colorIdx++;
      }

      const band = bands.find((b) => b.bandIndex === cut.band);
      const totalLanes = band ? band.lanes : 1;
      const laneHeightPx = rollRectHeight / totalLanes;

      const color = colorMap.get(cut.itemId) || COLORS[0];
      const cx = leftMargin + cut.positionMm * scale;
      const cy = y + cut.lane * laneHeightPx;
      const isFullRoll = cut.lengthMm / rollLengthMm >= 0.95;
      const cw = isFullRoll ? diagramWidth - cut.positionMm * scale : cut.lengthMm * scale;
      const ch = laneHeightPx;
      const rolls = cut.stripsPerPiece ?? 1;

      doc.save();
      doc.rect(cx + 0.5, cy + 0.5, Math.max(cw - 1, 1), Math.max(ch - 1, 1));
      doc.fillColor(color).fillOpacity(0.6).fill();
      doc.restore();

      if (cw > 20) {
        const label = rolls > 1 ? `${rolls} rolls` : cut.itemNo || cut.itemId;
        doc
          .save()
          .fontSize(5)
          .font("Helvetica-Bold")
          .fillColor("#000000")
          .fillOpacity(1)
          .text(label, cx + 2, cy + ch / 2 - 3, {
            width: cw - 4,
            height: ch,
            ellipsis: true,
            align: rolls > 1 ? "center" : "left",
          })
          .restore();
      }
    });

    if (totalBandHeight < rollLengthMm * 0.95) {
      const wasteX = leftMargin + totalBandHeight * scale;
      const wasteW = (rollLengthMm - totalBandHeight) * scale;
      doc.save();
      doc.rect(wasteX, y, wasteW, rollRectHeight);
      doc.fillColor("#D1D5DB").fillOpacity(0.4).fill();
      doc.restore();
    }

    doc.restore();
    y += rollRectHeight + 5;

    doc.fontSize(6).font("Helvetica").fillColor("#000000").fillOpacity(1);
    roll.cuts.forEach((cut) => {
      const color = colorMap.get(cut.itemId) || COLORS[0];
      doc.save();
      doc.rect(leftMargin, y, 6, 6).fillColor(color).fillOpacity(0.6).fill();
      doc.restore();

      const label = cut.itemNo || cut.itemId;
      const desc =
        cut.description.length > 50 ? `${cut.description.substring(0, 50)}...` : cut.description;
      doc
        .fillColor("#000000")
        .fillOpacity(1)
        .text(`${label}: ${desc} — ${cut.lengthMm}mm × ${cut.widthMm}mm`, leftMargin + 10, y, {
          width: diagramWidth - 10,
        });
      y += 10;
    });

    if (roll.offcuts.length > 0) {
      y += 3;
      doc.fontSize(6).font("Helvetica-Bold").fillColor("#666666");
      doc.text("Offcuts:", leftMargin, y);
      y += 8;
      doc.font("Helvetica").fontSize(5).fillColor("#888888");
      roll.offcuts.forEach((offcut) => {
        doc.text(
          `${offcut.widthMm}mm × ${offcut.lengthMm}mm (${offcut.areaSqM.toFixed(3)} m²)`,
          leftMargin + 10,
          y,
        );
        y += 8;
      });
    }

    return y + 5;
  }

  private drawAllocations(doc: typeof PDFDocument, jobCard: JobCard, startY: number): number {
    if (!jobCard.allocations || jobCard.allocations.length === 0) {
      return startY;
    }
    doc
      .moveTo(50, startY - 10)
      .lineTo(545, startY - 10)
      .stroke();

    doc.fontSize(12).font("Helvetica-Bold").text("Stock Allocations", 50, startY);

    let y = startY + 20;

    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("SKU", 50, y);
    doc.text("Item Name", 120, y);
    doc.text("Qty", 400, y);
    doc.text("Allocated By", 450, y);

    y += 15;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 5;

    doc.font("Helvetica").fontSize(8);
    jobCard.allocations.slice(0, 10).forEach((alloc) => {
      doc.text(alloc.stockItem?.sku || "-", 50, y, { width: 65 });
      doc.text(alloc.stockItem?.name || "-", 120, y, { width: 270 });
      doc.text(String(alloc.quantityUsed), 400, y);
      doc.text(alloc.allocatedBy || "-", 450, y, { width: 90 });
      y += 15;
    });

    return y + 10;
  }

  private drawSignatureBoxes(
    doc: typeof PDFDocument,
    approvals: JobCardApproval[],
    startY: number,
    stepConfigs: { key: string; label: string }[] = [],
  ): number {
    const STEP_KEY_TO_WORKFLOW_STEP: Record<string, WorkflowStep> = {
      document_upload: WorkflowStep.DOCUMENT_UPLOAD,
      admin_approval: WorkflowStep.ADMIN_APPROVAL,
      manager_approval: WorkflowStep.MANAGER_APPROVAL,
      requisition_sent: WorkflowStep.REQUISITION_SENT,
      stock_allocation: WorkflowStep.STOCK_ALLOCATION,
      manager_final: WorkflowStep.MANAGER_FINAL,
      ready_for_dispatch: WorkflowStep.READY_FOR_DISPATCH,
      dispatched: WorkflowStep.DISPATCHED,
    };

    const steps =
      stepConfigs.length > 0
        ? stepConfigs.map((sc) => ({
            step: STEP_KEY_TO_WORKFLOW_STEP[sc.key] ?? sc.key,
            label: sc.label,
          }))
        : [
            { step: WorkflowStep.DOCUMENT_UPLOAD, label: "Document Upload" },
            { step: WorkflowStep.ADMIN_APPROVAL, label: "Admin Approval" },
            { step: WorkflowStep.MANAGER_APPROVAL, label: "Manager Approval" },
            { step: WorkflowStep.REQUISITION_SENT, label: "Requisition Sent" },
            { step: WorkflowStep.STOCK_ALLOCATION, label: "Stock Allocation" },
            { step: WorkflowStep.MANAGER_FINAL, label: "Final Approval" },
            { step: WorkflowStep.READY_FOR_DISPATCH, label: "Ready for Dispatch" },
            { step: WorkflowStep.DISPATCHED, label: "Dispatched" },
          ];

    const approvalMap = new Map(
      approvals.filter((a) => a.status === ApprovalStatus.APPROVED).map((a) => [a.step, a]),
    );

    const boxWidth = 120;
    const boxHeight = 50;
    const boxGap = 4;
    const startX = 50;
    const boxesPerRow = 4;
    const totalRows = Math.ceil(steps.length / boxesPerRow);
    const totalHeight = totalRows * (boxHeight + boxGap) + 25;

    const pageHeight = doc.page.height;
    if (startY + totalHeight > pageHeight - 50) {
      doc.addPage();
      startY = 50;
    }

    doc
      .moveTo(startX, startY - 10)
      .lineTo(545, startY - 10)
      .stroke();

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Workflow Sign-Off", startX, startY - 8, { align: "center", width: 495 });

    steps.forEach(({ step, label }, index) => {
      const row = Math.floor(index / boxesPerRow);
      const col = index % boxesPerRow;
      const x = startX + col * (boxWidth + boxGap);
      const y = startY + 8 + row * (boxHeight + boxGap);

      doc.save();
      doc.rect(x, y, boxWidth, boxHeight).lineWidth(0.5).strokeColor("#CCCCCC").stroke();
      doc.strokeColor("black").lineWidth(1);
      doc.restore();

      doc
        .fontSize(7)
        .font("Helvetica-Bold")
        .fillColor("black")
        .text(label, x + 4, y + 4, { width: boxWidth - 8 });

      const approval = approvalMap.get(step as WorkflowStep);
      if (approval) {
        doc
          .fontSize(7)
          .font("Helvetica")
          .text(approval.approvedByName || "Unknown", x + 4, y + 16, { width: boxWidth - 8 });
        doc
          .fontSize(6)
          .fillColor("#666666")
          .text(formatDateTime(approval.approvedAt), x + 4, y + 28, { width: boxWidth - 8 });
        if (approval.signatureUrl) {
          doc
            .fontSize(6)
            .fillColor("#2563EB")
            .text("[Signed]", x + 4, y + 38, { width: boxWidth - 8 });
        }
        doc.fillColor("black");
      }
    });

    return startY + 8 + totalRows * (boxHeight + boxGap) + 10;
  }

  private partitionLineItems(lineItems: JobCard["lineItems"]): {
    filteredItems: JobCard["lineItems"];
    noteItems: JobCard["lineItems"];
  } {
    const filteredItems: JobCard["lineItems"] = [];
    const noteItems: JobCard["lineItems"] = [];

    (lineItems || []).forEach((item) => {
      const code = (item.itemCode || "").trim();
      const description = (item.itemDescription || "").trim();
      const textToCheck = code || description;

      if (!textToCheck) return;

      const invalidPatterns = [
        /^production$/i,
        /^foreman?\s*sign/i,
        /^forman\s*sign/i,
        /^material\s*spec/i,
        /^job\s*comp\s*date/i,
        /^completion\s*date/i,
        /^supervisor/i,
        /^quality\s*control/i,
        /^qc\s*sign/i,
        /^inspector/i,
        /^approved\s*by/i,
        /^checked\s*by/i,
        /^date$/i,
        /^signature$/i,
        /^sign$/i,
        /^remarks$/i,
        /^comments$/i,
        /^notes$/i,
      ];

      const isFormLabel = invalidPatterns.some((pattern) => pattern.test(textToCheck));
      if (isFormLabel) return;

      const qty = item.quantity;
      const hasNoData =
        !description && !item.itemNo && !item.jtNo && (qty === null || Number.isNaN(qty));

      if (hasNoData && code) {
        const isMultiLine = code.includes("\n");
        const looksLikeLabel = /^[A-Za-z\s]+$/.test(code) && code.length < 30;
        const isLongTextNote = code.length > 60;
        const isRubberSpecNote =
          /^r\/l\b/i.test(code) || /rubber\s+(lining|sheet|lagging)/i.test(code);

        if (isMultiLine || isLongTextNote || isRubberSpecNote) {
          noteItems.push(item);
          return;
        }
        if (looksLikeLabel) return;
      }

      filteredItems.push(item);
    });

    return { filteredItems, noteItems };
  }

  private drawFooter(doc: typeof PDFDocument): void {
    const pageHeight = doc.page.height;
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    const generatedText = `Generated: ${formatDateTime(new Date())}`;

    Array.from({ length: totalPages }, (_, i) => i).forEach((i) => {
      doc.switchToPage(i);

      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.y = 0;

      doc.fontSize(8).font("Helvetica").fillColor("#666666");
      doc.text(generatedText, 50, pageHeight - 40, {
        align: "center",
        width: 495,
        lineBreak: false,
      });
      doc.y = 0;
      doc.text(`Page ${i + 1} of ${totalPages}`, 50, pageHeight - 28, {
        align: "center",
        width: 495,
        lineBreak: false,
      });

      doc.page.margins.bottom = savedBottom;
      doc.y = 0;
    });

    doc.fillColor("black");
  }
}
