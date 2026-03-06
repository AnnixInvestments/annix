import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import { Repository } from "typeorm";
import { formatDateTime } from "../../lib/datetime";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { JobCard } from "../entities/job-card.entity";
import {
  ApprovalStatus,
  JobCardApproval,
  WorkflowStep,
} from "../entities/job-card-approval.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { calculateCuttingPlan, type RollAllocation } from "../lib/rubberCuttingCalculator";

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
    private readonly configService: ConfigService,
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

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const qrUrl = `${frontendUrl}/stock-control/portal/job-cards/${jobCardId}/dispatch`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1 });

    const buffer = await this.createPdf(jobCard, company, approvals, coatingAnalysis, qrDataUrl);
    const filename = `JC-${jobCard.jobNumber}-${jobCard.id}.pdf`;

    return { buffer, filename };
  }

  private async createPdf(
    jobCard: JobCard,
    company: StockControlCompany | null,
    approvals: JobCardApproval[],
    coatingAnalysis: JobCardCoatingAnalysis | null,
    qrDataUrl: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const { noteItems } = this.partitionLineItems(jobCard.lineItems);

      this.drawHeader(doc, company, jobCard);
      this.drawJobCardDetails(doc, jobCard, noteItems);
      this.drawQrCode(doc, qrDataUrl);

      let currentY = 280;
      currentY = this.drawLineItems(doc, jobCard, currentY);
      currentY = this.drawRubberAllocation(doc, jobCard, currentY);
      currentY = this.drawCoatingSpecification(doc, coatingAnalysis, currentY);
      currentY = this.drawAllocations(doc, jobCard, currentY);
      this.drawSignatureBoxes(doc, approvals);
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
  ): void {
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

    if (jobCard.description) {
      y += Math.ceil(details.length / 2) * 20 + 10;
      doc
        .font("Helvetica-Bold")
        .text("Description:", leftCol, y)
        .font("Helvetica")
        .text(jobCard.description, leftCol, y + 15, { width: 495 });
    }

    const noteTexts = (noteItems || []).map((item) => (item.itemCode || "").trim()).filter(Boolean);
    const combinedNotes = [jobCard.notes, ...noteTexts].filter(Boolean).join("\n\n");

    if (combinedNotes) {
      const descHeight = jobCard.description
        ? 30 + Math.ceil(jobCard.description.length / 80) * 12
        : 0;
      y += descHeight + 20;
      doc
        .font("Helvetica-Bold")
        .text("Notes:", leftCol, y)
        .font("Helvetica")
        .text(combinedNotes, leftCol, y + 15, { width: 495 });
    }
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
    doc.text("DFT (µm)", 280, y);
    doc.text("Coverage (m²/L)", 350, y);
    doc.text("Allowed Litres", 460, y);

    y += 15;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 5;

    doc.font("Helvetica").fontSize(8);
    coatingAnalysis.coats.forEach((coat) => {
      const dftRange =
        coat.minDftUm === coat.maxDftUm
          ? String(coat.minDftUm)
          : `${coat.minDftUm}-${coat.maxDftUm}`;

      doc.text(coat.product, 50, y, { width: 220 });
      doc.text(dftRange, 280, y);
      doc.text(String(coat.coverageM2PerLiter.toFixed(2)), 350, y);
      doc.text(coat.litersRequired === 0 ? "—" : String(coat.litersRequired.toFixed(1)), 460, y);
      y += 15;
    });

    doc.fillColor("#999999").fontSize(7).font("Helvetica");
    doc.text("Coverage includes 55% piping loss factor", 50, y);
    y += 12;

    return y + 10;
  }

  private drawRubberAllocation(doc: typeof PDFDocument, jobCard: JobCard, startY: number): number {
    const allText = [
      jobCard.notes || "",
      ...(jobCard.lineItems || []).map((li) => `${li.itemCode || ""} ${li.itemDescription || ""}`),
    ]
      .join(" ")
      .toLowerCase();

    const isRubberJob =
      allText.includes("rubber") ||
      allText.includes("r/l") ||
      allText.includes("lining") ||
      allText.includes("liner") ||
      allText.includes("lagging");

    if (!isRubberJob) return startY;

    const { filteredItems } = this.partitionLineItems(jobCard.lineItems);
    const plan = calculateCuttingPlan(
      filteredItems.map((li) => ({
        id: li.id,
        itemCode: li.itemCode,
        itemDescription: li.itemDescription,
        itemNo: li.itemNo,
        quantity: li.quantity,
        m2: li.m2,
      })),
    );

    const totalM2 = (jobCard.lineItems || []).reduce(
      (sum, li) => sum + (li.m2 ? Number(li.m2) : 0),
      0,
    );

    if (totalM2 <= 0 && !plan.hasPipeItems) return startY;

    doc
      .moveTo(50, startY - 10)
      .lineTo(545, startY - 10)
      .stroke();

    doc.fontSize(12).font("Helvetica-Bold").text("Rubber Allocation", 50, startY);

    let y = startY + 15;

    if (plan.hasPipeItems) {
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

      plan.rolls.forEach((roll) => {
        const diagramHeight = this.cuttingDiagramHeight(roll);
        const pageHeight = doc.page.height;
        if (y + diagramHeight > pageHeight - 165) {
          doc.addPage();
          y = 50;
        }
        y = this.drawCuttingDiagramForRoll(doc, roll, y);
      });
    } else {
      const rollAreaM2 = 15.0;
      const rollsNeeded = Math.ceil(totalM2 / rollAreaM2);
      const lastRollUsage = totalM2 - (rollsNeeded - 1) * rollAreaM2;
      const lastRollPercent = Math.round((lastRollUsage / rollAreaM2) * 100);
      const leftover = rollsNeeded * rollAreaM2 - totalM2;

      doc
        .fontSize(8)
        .font("Helvetica")
        .text("Standard tank work rolls: 1200mm x 12.5m = 15.00 m² per roll", 50, y);

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

    return y + 10;
  }

  private cuttingDiagramHeight(roll: RollAllocation): number {
    const rollRectHeight = 60;
    const headerHeight = 15;
    const cutListHeight = roll.cuts.length * 10 + 5;
    return headerHeight + rollRectHeight + cutListHeight + 15;
  }

  private drawCuttingDiagramForRoll(
    doc: typeof PDFDocument,
    roll: RollAllocation,
    startY: number,
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
    const rollRectHeight = 60;
    const rollLengthMm = roll.rollSpec.lengthM * 1000;
    const lanes = roll.rollSpec.lanes;
    const laneHeight = rollRectHeight / lanes;
    const scale = diagramWidth / rollLengthMm;

    let y = startY;

    doc.fontSize(8).font("Helvetica-Bold");
    doc.text(
      `Roll ${roll.rollIndex}: ${roll.rollSpec.widthMm}mm × ${roll.rollSpec.lengthM}m` +
        (roll.hasLengthwiseCut ? ` (${lanes} lanes)` : "") +
        ` — Waste: ${roll.wastePercentage.toFixed(1)}%`,
      leftMargin,
      y,
    );
    y += 14;

    doc.save();
    doc.rect(leftMargin, y, diagramWidth, rollRectHeight).lineWidth(0.5).stroke();

    if (roll.hasLengthwiseCut) {
      Array.from({ length: lanes - 1 }, (_, i) => i + 1).forEach((i) => {
        const laneY = y + i * laneHeight;
        doc
          .save()
          .dash(3, { space: 2 })
          .moveTo(leftMargin, laneY)
          .lineTo(leftMargin + diagramWidth, laneY)
          .stroke()
          .restore();
      });
    }

    const colorMap = new Map<string, string>();
    let colorIdx = 0;

    roll.cuts.forEach((cut) => {
      if (!colorMap.has(cut.itemId)) {
        colorMap.set(cut.itemId, COLORS[colorIdx % COLORS.length]);
        colorIdx++;
      }

      const color = colorMap.get(cut.itemId) || COLORS[0];
      const cx = leftMargin + cut.positionMm * scale;
      const cy = y + cut.lane * laneHeight;
      const cw = cut.lengthMm * scale;
      const ch = laneHeight;

      doc.save();
      doc.rect(cx + 0.5, cy + 0.5, Math.max(cw - 1, 1), Math.max(ch - 1, 1));
      doc.fillColor(color).fillOpacity(0.6).fill();
      doc.restore();

      if (cw > 20) {
        const label = cut.itemNo || cut.itemId;
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
          })
          .restore();
      }
    });

    const maxUsed = Math.max(...roll.usedLengthMm);
    if (maxUsed < rollLengthMm) {
      const wasteX = leftMargin + maxUsed * scale;
      const wasteW = (rollLengthMm - maxUsed) * scale;
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

  private drawSignatureBoxes(doc: typeof PDFDocument, approvals: JobCardApproval[]): void {
    const stepLabels: { step: WorkflowStep; label: string }[] = [
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

    const pageHeight = doc.page.height;
    const boxWidth = 120;
    const boxHeight = 50;
    const boxGap = 4;
    const startX = 50;
    const startY = pageHeight - 165;
    const boxesPerRow = 4;

    doc
      .moveTo(startX, startY - 10)
      .lineTo(545, startY - 10)
      .stroke();

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Workflow Sign-Off", startX, startY - 8, { align: "center", width: 495 });

    stepLabels.forEach(({ step, label }, index) => {
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

      const approval = approvalMap.get(step);
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

    doc
      .fontSize(8)
      .font("Helvetica")
      .text(`Generated: ${formatDateTime(new Date())}`, 50, pageHeight - 50, {
        align: "center",
        width: 495,
      });

    const totalPages = doc.bufferedPageRange().count;
    doc.text(`Page ${totalPages} of ${totalPages}`, 50, pageHeight - 35, {
      align: "center",
      width: 495,
    });
  }
}
