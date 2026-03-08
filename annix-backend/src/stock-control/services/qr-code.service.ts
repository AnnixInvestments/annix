import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import { ILike, In, Repository } from "typeorm";
import { formatDateTime } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { JobCard } from "../entities/job-card.entity";
import {
  ApprovalStatus,
  JobCardApproval,
  WorkflowStep,
} from "../entities/job-card-approval.entity";
import { StaffMember } from "../entities/staff-member.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockItem } from "../entities/stock-item.entity";

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);

  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(StaffMember)
    private readonly staffMemberRepo: Repository<StaffMember>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingAnalysisRepo: Repository<JobCardCoatingAnalysis>,
    @InjectRepository(JobCardApproval)
    private readonly approvalRepo: Repository<JobCardApproval>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async stockItemQrPng(itemId: number, companyId: number): Promise<Buffer> {
    await this.findStockItem(itemId, companyId);
    return QRCode.toBuffer(`stock:${itemId}`, { width: 300, margin: 2 });
  }

  async jobCardQrPng(jobId: number, companyId: number): Promise<Buffer> {
    await this.findJobCard(jobId, companyId);
    return QRCode.toBuffer(`job:${jobId}`, { width: 300, margin: 2 });
  }

  async stockItemLabelPdf(itemId: number, companyId: number): Promise<Buffer> {
    const item = await this.findStockItem(itemId, companyId);
    const qrBuffer = await QRCode.toBuffer(`stock:${itemId}`, { width: 300, margin: 2 });

    const mmToPt = (mm: number) => mm * 2.83465;
    const pageWidth = mmToPt(210);
    const pageHeight = mmToPt(148);

    const doc = new PDFDocument({
      size: [pageWidth, pageHeight],
      margin: 0,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const centerX = pageWidth / 2;
    let y = mmToPt(20);

    doc.fillColor("#6b7280").fontSize(10).font("Helvetica");
    doc.text("STOCK CONTROL", 0, y, { width: pageWidth, align: "center" });
    y += mmToPt(6);

    doc.fillColor("#111827").fontSize(22).font("Helvetica-Bold");
    doc.text(item.name, mmToPt(15), y, { width: pageWidth - mmToPt(30), align: "center" });
    y += mmToPt(10);

    doc.fillColor("#374151").fontSize(14).font("Courier");
    doc.text(item.sku, 0, y, { width: pageWidth, align: "center" });
    y += mmToPt(8);

    const qrSize = mmToPt(40);
    doc.image(qrBuffer, centerX - qrSize / 2, y, { width: qrSize });
    y += qrSize + mmToPt(3);

    doc.fillColor("#9ca3af").fontSize(9).font("Courier");
    doc.text(`stock:${item.id}`, 0, y, { width: pageWidth, align: "center" });
    y += mmToPt(5);

    if (item.location) {
      doc.fillColor("#4b5563").fontSize(11).font("Helvetica");
      doc.text(item.location, 0, y, { width: pageWidth, align: "center" });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
  }

  async jobCardPdf(jobId: number, companyId: number): Promise<Buffer> {
    const jobCard = await this.findJobCard(jobId, companyId);
    const qrBuffer = await QRCode.toBuffer(`job:${jobId}`, { width: 200, margin: 2 });

    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    const coatingAnalysis = await this.coatingAnalysisRepo.findOne({
      where: { jobCardId: jobId, companyId },
    });

    const { filteredItems: lineItems, noteItems } = this.partitionLineItems(
      (jobCard.lineItems ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
    );

    const mmToPt = (mm: number) => mm * 2.83465;
    const margin = mmToPt(15);
    const pageWidth = 595.28;
    const contentWidth = pageWidth - margin * 2;

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    let y = margin;

    doc.rect(margin, y, contentWidth, mmToPt(22)).fillColor("#f0fdfa").fill();

    doc.fillColor("#0d9488").fontSize(18).font("Helvetica-Bold");
    doc.text("Job Card", margin + mmToPt(3), y + mmToPt(5));

    doc.fillColor("#6b7280").fontSize(10).font("Helvetica");
    const formatPageNumber = (pn: string | null): string | null => {
      if (!pn) return null;
      return pn.toLowerCase().startsWith("page") ? pn : `Page ${pn}`;
    };

    const subtitle = [
      jobCard.jobNumber,
      jobCard.jcNumber ? `JC ${jobCard.jcNumber}` : null,
      formatPageNumber(jobCard.pageNumber),
    ]
      .filter(Boolean)
      .join(" | ");
    doc.text(subtitle, margin + mmToPt(3), y + mmToPt(12));

    const qrSize = mmToPt(18);
    doc.image(qrBuffer, pageWidth - margin - qrSize - mmToPt(2), y + mmToPt(2), { width: qrSize });
    doc.fillColor("#9ca3af").fontSize(7).font("Courier");
    doc.text(`job:${jobId}`, pageWidth - margin - qrSize - mmToPt(2), y + mmToPt(2) + qrSize + 2, {
      width: qrSize,
      align: "center",
    });

    y += mmToPt(26);

    const detailFields: [string, string | null][] = [
      ["Job Name", jobCard.jobName],
      ["Customer", jobCard.customerName],
      ["PO Number", jobCard.poNumber],
      ["Site / Location", jobCard.siteLocation],
      ["Contact Person", jobCard.contactPerson],
      ["Due Date", jobCard.dueDate],
      ["Reference", jobCard.reference],
      ["Status", jobCard.status],
    ];

    const colWidth = contentWidth / 2;
    let col = 0;
    const startY = y;

    for (const [label, value] of detailFields) {
      if (!value) continue;
      const x = margin + col * colWidth;
      doc.fillColor("#6b7280").fontSize(7).font("Helvetica-Bold");
      doc.text(label.toUpperCase(), x, y);
      doc.fillColor("#111827").fontSize(10).font("Helvetica");
      doc.text(value, x, y + 9);
      col++;
      if (col >= 2) {
        col = 0;
        y += mmToPt(10);
      }
    }
    if (col !== 0) y += mmToPt(10);
    y += mmToPt(5);

    if (lineItems.length > 0) {
      doc.fillColor("#111827").fontSize(11).font("Helvetica-Bold");
      doc.text("Line Items", margin, y);
      y += mmToPt(5);

      const colWidths = [22, 110, 150, 70, 40, 70];
      const headers = ["#", "Item Code", "Description", "Item No", "Qty", "JT No"];
      const minRowHeight = mmToPt(6);
      const lineHeight = 10;

      const renderLineItemsHeader = () => {
        doc.rect(margin, y, contentWidth, mmToPt(6)).fillColor("#f3f4f6").fill();
        doc.fillColor("#374151").fontSize(7).font("Helvetica-Bold");
        let headerX = margin + 3;
        headers.forEach((header, i) => {
          doc.text(header.toUpperCase(), headerX, y + 4, {
            width: colWidths[i] - 6,
            align: i === 4 ? "right" : "left",
          });
          headerX += colWidths[i];
        });
        y += mmToPt(6);
      };

      renderLineItemsHeader();

      doc.fontSize(8).font("Helvetica");
      lineItems.forEach((li, idx) => {
        const itemCodeText = li.itemCode ?? "-";
        const descText = li.itemDescription ?? "-";
        const itemNoText = li.itemNo ?? "-";
        const jtNoText = li.jtNo ?? "-";

        const estimateLines = (text: string, colWidth: number) => {
          const charsPerLine = Math.floor((colWidth - 6) / 4.5);
          return Math.max(1, Math.ceil(text.length / charsPerLine));
        };

        const itemCodeLines = estimateLines(itemCodeText, colWidths[1]);
        const descLines = estimateLines(descText, colWidths[2]);
        const itemNoLines = estimateLines(itemNoText, colWidths[3]);
        const jtNoLines = estimateLines(jtNoText, colWidths[5]);

        const maxLines = Math.max(itemCodeLines, descLines, itemNoLines, jtNoLines);
        const calculatedHeight = maxLines * lineHeight + 8;
        const rowHeight = Math.max(minRowHeight, calculatedHeight);

        if (y + rowHeight > 780) {
          doc.addPage();
          y = margin;
          doc.fillColor("#111827").fontSize(11).font("Helvetica-Bold");
          doc.text("Line Items (cont.)", margin, y);
          y += mmToPt(5);
          renderLineItemsHeader();
          doc.fontSize(8).font("Helvetica");
        }

        let xPos = margin + 3;
        doc.fillColor("#111827");
        doc.text(String(idx + 1), xPos, y + 4, { width: colWidths[0] - 6 });
        xPos += colWidths[0];
        doc.text(itemCodeText, xPos, y + 4, { width: colWidths[1] - 6 });
        xPos += colWidths[1];
        doc.text(descText, xPos, y + 4, { width: colWidths[2] - 6 });
        xPos += colWidths[2];
        doc.text(itemNoText, xPos, y + 4, { width: colWidths[3] - 6 });
        xPos += colWidths[3];
        doc.text(li.quantity != null ? String(li.quantity) : "-", xPos, y + 4, {
          width: colWidths[4] - 6,
          align: "right",
        });
        xPos += colWidths[4];
        doc.text(jtNoText, xPos, y + 4, { width: colWidths[5] - 6 });

        y += rowHeight;
        doc
          .moveTo(margin, y)
          .lineTo(margin + contentWidth, y)
          .strokeColor("#e5e7eb")
          .stroke();
        y += 3;
      });
      y += mmToPt(8);
    }

    if (coatingAnalysis?.coats && coatingAnalysis.coats.length > 0) {
      const totalPipeQty = lineItems.reduce(
        (sum, li) => sum + (li.quantity ? Number(li.quantity) : 0),
        0,
      );

      doc.fillColor("#111827").fontSize(11).font("Helvetica-Bold");
      doc.text("Coating Specification", margin, y);
      y += mmToPt(5);

      const coatColWidths = [210, 60, 70, 55, 55];
      const coatHeaders = ["Product", "DFT (μm)", "Coverage (m²/L)", "Allowed Litres", "L/Pipe"];
      const coatMinRowHeight = mmToPt(6);
      const coatLineHeight = 10;

      const renderCoatHeader = () => {
        doc.rect(margin, y, contentWidth, mmToPt(6)).fillColor("#f3f4f6").fill();
        doc.fillColor("#374151").fontSize(7).font("Helvetica-Bold");
        let headerX = margin + 3;
        coatHeaders.forEach((header, i) => {
          doc.text(header.toUpperCase(), headerX, y + 4, {
            width: coatColWidths[i] - 6,
            align: i > 0 ? "right" : "left",
          });
          headerX += coatColWidths[i];
        });
        y += mmToPt(6);
      };

      renderCoatHeader();

      doc.fontSize(8).font("Helvetica");
      coatingAnalysis.coats.forEach((coat) => {
        const charsPerLine = Math.floor((coatColWidths[0] - 6) / 4.5);
        const productLines = Math.max(1, Math.ceil(coat.product.length / charsPerLine));
        const calculatedHeight = productLines * coatLineHeight + 8;
        const rowHeight = Math.max(coatMinRowHeight, calculatedHeight);

        if (y + rowHeight > 780) {
          doc.addPage();
          y = margin;
          doc.fillColor("#111827").fontSize(11).font("Helvetica-Bold");
          doc.text("Coating Specification (cont.)", margin, y);
          y += mmToPt(5);
          renderCoatHeader();
          doc.fontSize(8).font("Helvetica");
        }

        const litresPerPipe =
          totalPipeQty > 0 && coat.litersRequired > 0
            ? coat.litersRequired / totalPipeQty
            : 0;

        let xPos = margin + 3;
        doc.fillColor("#111827");
        doc.text(coat.product, xPos, y + 4, { width: coatColWidths[0] - 6 });
        xPos += coatColWidths[0];
        doc.text(`${coat.minDftUm}-${coat.maxDftUm}`, xPos, y + 4, {
          width: coatColWidths[1] - 6,
          align: "right",
        });
        xPos += coatColWidths[1];
        doc.text(coat.coverageM2PerLiter.toFixed(2), xPos, y + 4, {
          width: coatColWidths[2] - 6,
          align: "right",
        });
        xPos += coatColWidths[2];
        doc.text(coat.litersRequired === 0 ? "—" : coat.litersRequired.toFixed(2), xPos, y + 4, {
          width: coatColWidths[3] - 6,
          align: "right",
        });
        xPos += coatColWidths[3];
        doc.text(litresPerPipe === 0 ? "—" : litresPerPipe.toFixed(2), xPos, y + 4, {
          width: coatColWidths[4] - 6,
          align: "right",
        });

        y += rowHeight;
        doc
          .moveTo(margin, y)
          .lineTo(margin + contentWidth, y)
          .strokeColor("#e5e7eb")
          .stroke();
        y += 3;
      });

      const lossPct = company?.pipingLossFactorPct ?? 45;
      doc.fillColor("#9ca3af").fontSize(7).font("Helvetica");
      doc.text(`Coverage includes ${lossPct}% piping loss factor`, margin + 3, y + 2);
      y += mmToPt(8);
    }

    y = this.drawRubberAllocation(doc, jobCard, y, margin, contentWidth, mmToPt);

    const noteTexts = noteItems.map((item) => (item.itemCode || "").trim()).filter(Boolean);
    const combinedNotes = [jobCard.notes, ...noteTexts].filter(Boolean).join("\n\n");

    if (combinedNotes) {
      doc.fillColor("#6b7280").fontSize(7).font("Helvetica-Bold");
      doc.text("NOTES", margin, y);
      y += mmToPt(3);
      doc.fillColor("#111827").fontSize(9).font("Helvetica");
      doc.text(combinedNotes, margin, y, { width: contentWidth });
      y += mmToPt(8);
    }

    const approvals = await this.approvalRepo.find({
      where: { jobCardId: jobId, companyId },
      order: { createdAt: "ASC" },
    });

    this.drawSignatureBoxes(doc, approvals, margin, contentWidth);

    const pageHeight = doc.page.height;
    doc.fillColor("#9ca3af").fontSize(7).font("Helvetica");
    doc.text("Generated from Stock Control System", margin, pageHeight - mmToPt(12), {
      width: contentWidth,
      align: "center",
    });

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
  }

  private drawSignatureBoxes(
    doc: typeof PDFDocument,
    approvals: JobCardApproval[],
    margin: number,
    contentWidth: number,
  ): void {
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
    const mmToPt = (mm: number) => mm * 2.83465;
    const boxesPerRow = 4;
    const boxGap = 4;
    const boxWidth = (contentWidth - boxGap * (boxesPerRow - 1)) / boxesPerRow;
    const boxHeight = mmToPt(18);
    const startY = pageHeight - mmToPt(55);

    doc
      .moveTo(margin, startY - 8)
      .lineTo(margin + contentWidth, startY - 8)
      .strokeColor("#e5e7eb")
      .stroke();

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor("#374151")
      .text("Workflow Sign-Off", margin, startY - 6, { align: "center", width: contentWidth });

    stepLabels.forEach(({ step, label }, index) => {
      const row = Math.floor(index / boxesPerRow);
      const col = index % boxesPerRow;
      const x = margin + col * (boxWidth + boxGap);
      const y = startY + 10 + row * (boxHeight + boxGap);

      doc.save();
      doc.rect(x, y, boxWidth, boxHeight).lineWidth(0.5).strokeColor("#CCCCCC").stroke();
      doc.restore();

      doc
        .fontSize(6.5)
        .font("Helvetica-Bold")
        .fillColor("#374151")
        .text(label, x + 3, y + 3, { width: boxWidth - 6 });

      const approval = approvalMap.get(step);
      if (approval) {
        doc
          .fontSize(6.5)
          .font("Helvetica")
          .fillColor("#111827")
          .text(approval.approvedByName || "Unknown", x + 3, y + 13, { width: boxWidth - 6 });
        doc
          .fontSize(5.5)
          .fillColor("#6b7280")
          .text(formatDateTime(approval.approvedAt), x + 3, y + 23, { width: boxWidth - 6 });
        if (approval.signatureUrl) {
          doc
            .fontSize(5.5)
            .fillColor("#2563EB")
            .text("[Signed]", x + 3, y + 32, { width: boxWidth - 6 });
        }
        doc.fillColor("#111827");
      }
    });
  }

  private drawRubberAllocation(
    doc: typeof PDFDocument,
    jobCard: JobCard,
    startY: number,
    margin: number,
    contentWidth: number,
    mmToPt: (mm: number) => number,
  ): number {
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

    const totalM2 = (jobCard.lineItems || []).reduce(
      (sum, li) => sum + (li.m2 ? Number(li.m2) : 0),
      0,
    );

    if (totalM2 <= 0) return startY;

    const manualRolls = jobCard.rubberPlanOverride?.manualRolls;
    const rollWidthMm =
      manualRolls && manualRolls.length > 0 ? manualRolls[0].widthMm : 1200;
    const rollLengthM =
      manualRolls && manualRolls.length > 0 ? manualRolls[0].lengthM : 12.5;
    const rollAreaM2 = (rollWidthMm / 1000) * rollLengthM;
    const rollsNeeded = Math.ceil(totalM2 / rollAreaM2);
    const lastRollUsage = totalM2 - (rollsNeeded - 1) * rollAreaM2;
    const lastRollPercent = Math.round((lastRollUsage / rollAreaM2) * 100);
    const leftover = rollsNeeded * rollAreaM2 - totalM2;

    let y = startY;

    if (y + mmToPt(40) > 780) {
      doc.addPage();
      y = margin;
    }

    doc.fillColor("#111827").fontSize(11).font("Helvetica-Bold");
    doc.text("Rubber Allocation", margin, y);
    y += mmToPt(4);

    doc.fillColor("#6b7280").fontSize(7).font("Helvetica");
    doc.text(
      `Standard work rolls: ${rollWidthMm}mm × ${rollLengthM}m = ${rollAreaM2.toFixed(2)} m² per roll`,
      margin + 3,
      y,
    );
    y += mmToPt(4);

    doc.fillColor("#111827").fontSize(8).font("Helvetica-Bold");
    const statsY = y;
    doc.text(`Total: ${totalM2.toFixed(2)} m²`, margin + 3, statsY);
    doc.text(`Rolls: ${rollsNeeded}`, margin + mmToPt(40), statsY);
    doc.text(`Last Roll: ${lastRollPercent}%`, margin + mmToPt(70), statsY);
    doc.text(`Leftover: ${leftover.toFixed(2)} m²`, margin + mmToPt(105), statsY);
    y += mmToPt(5);

    const itemsWithM2 = (jobCard.lineItems || []).filter(
      (li) => li.m2 !== null && Number(li.m2) > 0,
    );

    if (itemsWithM2.length > 0) {
      doc.fontSize(7).font("Helvetica").fillColor("#374151");
      itemsWithM2.forEach((li) => {
        if (y + 12 > 780) {
          doc.addPage();
          y = margin;
        }
        const label = li.itemDescription
          ? `${li.itemCode || ""} - ${li.itemDescription}`
          : li.itemCode || "-";
        const qty = li.quantity ? `× ${li.quantity}` : "";
        doc.text(`${label} ${qty}`.trim(), margin + 6, y, { width: contentWidth - mmToPt(40) });
        doc.text(`${Number(li.m2).toFixed(2)} m²`, margin + contentWidth - mmToPt(25), y, {
          width: mmToPt(25),
          align: "right",
        });
        y += 10;
      });
    }

    y += mmToPt(5);
    return y;
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

        if (isMultiLine || isLongTextNote) {
          noteItems.push(item);
          return;
        }
        if (looksLikeLabel) return;
      }

      filteredItems.push(item);
    });

    return { filteredItems, noteItems };
  }

  async staffIdCardPdf(staffId: number, companyId: number): Promise<Buffer> {
    const staff = await this.findStaffMember(staffId, companyId);
    return this.generateStaffIdCardsPdf([staff]);
  }

  async batchStaffIdCardsPdf(companyId: number, ids?: number[]): Promise<Buffer> {
    const whereClause: { companyId: number; active: boolean; id?: ReturnType<typeof In> } = {
      companyId,
      active: true,
    };
    if (ids && ids.length > 0) {
      whereClause.id = In(ids);
    }
    const staffMembers = await this.staffMemberRepo.find({
      where: whereClause,
      relations: ["departmentEntity"],
      order: { name: "ASC" },
    });
    if (staffMembers.length === 0) {
      throw new NotFoundException("No staff members found");
    }
    return this.generateStaffIdCardsPdf(staffMembers);
  }

  private async generateStaffIdCardsPdf(staffMembers: StaffMember[]): Promise<Buffer> {
    const mmToPt = (mm: number) => mm * 2.83465;

    const cardWidth = mmToPt(85);
    const cardHeight = mmToPt(54);
    const gap = mmToPt(8);
    const margin = mmToPt(10);
    const headerHeight = mmToPt(8);
    const cardsPerRow = 2;
    const cardsPerPage = 8;

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    for (let i = 0; i < staffMembers.length; i++) {
      const staff = staffMembers[i];
      const pageIndex = Math.floor(i / cardsPerPage);
      const cardIndexOnPage = i % cardsPerPage;

      if (cardIndexOnPage === 0 && i > 0) {
        doc.addPage();
      }

      const col = cardIndexOnPage % cardsPerRow;
      const row = Math.floor(cardIndexOnPage / cardsPerRow);

      const x = margin + col * (cardWidth + gap);
      const y = margin + row * (cardHeight + gap);

      doc.roundedRect(x, y, cardWidth, cardHeight, mmToPt(3)).strokeColor("#d1d5db").stroke();

      doc.rect(x, y, cardWidth, headerHeight).fillColor("#0d9488").fill();

      doc
        .fillColor("#ffffff")
        .fontSize(8)
        .text("STAFF ID CARD", x, y + mmToPt(2), {
          width: cardWidth,
          align: "center",
        });

      const bodyY = y + headerHeight + mmToPt(3);
      const photoX = x + mmToPt(3);
      const photoWidth = mmToPt(22);
      const photoHeight = mmToPt(28);

      doc
        .roundedRect(photoX, bodyY, photoWidth, photoHeight, mmToPt(2))
        .fillColor("#e5e7eb")
        .fill();

      if (staff.photoUrl) {
        try {
          const photoBuffer = await this.fetchPhotoBuffer(staff.photoUrl);
          if (photoBuffer) {
            doc.image(photoBuffer, photoX, bodyY, {
              width: photoWidth,
              height: photoHeight,
              fit: [photoWidth, photoHeight],
            });
          }
        } catch {
          this.logger.warn(`Failed to load photo for staff ${staff.id}`);
        }
      }

      const infoX = photoX + photoWidth + mmToPt(3);
      const infoWidth = cardWidth - photoWidth - mmToPt(28);
      let infoY = bodyY + mmToPt(8);

      doc.fillColor("#111827").fontSize(11).font("Helvetica-Bold");
      doc.text(staff.name, infoX, infoY, { width: infoWidth });
      infoY += 14;

      if (staff.employeeNumber) {
        doc.fillColor("#0d9488").fontSize(9).font("Courier-Bold");
        doc.text(staff.employeeNumber, infoX, infoY, { width: infoWidth });
        infoY += 12;
      }

      const departmentName = staff.departmentEntity?.name ?? staff.department ?? "";
      if (departmentName) {
        doc.fillColor("#6b7280").fontSize(8).font("Helvetica");
        doc.text(departmentName, infoX, infoY, { width: infoWidth });
      }

      const qrSize = mmToPt(20);
      const qrX = x + cardWidth - qrSize - mmToPt(3);
      const qrY = bodyY + mmToPt(4);

      const qrBuffer = await QRCode.toBuffer(`staff:${staff.qrToken}`, {
        width: 200,
        margin: 1,
      });
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
  }

  private async fetchPhotoBuffer(photoUrl: string): Promise<Buffer | null> {
    try {
      if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
        const response = await fetch(photoUrl, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return null;
        return Buffer.from(await response.arrayBuffer());
      }
      return await this.storageService.download(photoUrl);
    } catch {
      return null;
    }
  }

  private async resolvePhotoUrl(photoUrl: string): Promise<string | null> {
    this.logger.log(`Resolving photo URL: ${photoUrl}`);
    try {
      let s3Path: string | null = null;

      if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
        const s3Match = photoUrl.match(/\.amazonaws\.com\/(.+?)(\?|$)/);
        if (s3Match) {
          s3Path = decodeURIComponent(s3Match[1]);
          this.logger.log(`Extracted S3 path from URL: ${s3Path}`);
        }
      } else {
        s3Path = photoUrl;
      }

      if (!s3Path) {
        this.logger.warn(`Could not determine S3 path from: ${photoUrl}`);
        return null;
      }

      this.logger.log(`Downloading photo from storage: ${s3Path}`);
      const imageBuffer = await this.storageService.download(s3Path);

      const mimeType = this.detectMimeType(imageBuffer);
      this.logger.log(`Photo resolved successfully: ${imageBuffer.length} bytes, ${mimeType}`);
      return `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
    } catch (error) {
      this.logger.error(
        `Failed to resolve photo "${photoUrl}": ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  private detectMimeType(buffer: Buffer): string {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return "image/jpeg";
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return "image/png";
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return "image/gif";
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      return "image/webp";
    }
    return "image/jpeg";
  }

  async clearNeedsQrPrint(companyId: number, ids: number[]): Promise<{ cleared: number }> {
    if (ids.length === 0) {
      return { cleared: 0 };
    }
    const result = await this.stockItemRepo.update(
      { id: In(ids), companyId },
      { needsQrPrint: false },
    );
    return { cleared: result.affected ?? 0 };
  }

  async batchStockItemLabelsPdf(
    companyId: number,
    ids?: number[],
    search?: string,
    category?: string,
  ): Promise<Buffer> {
    const whereClause: Record<string, unknown> = { companyId };

    if (ids && ids.length > 0) {
      whereClause.id = In(ids);
    }
    if (category) {
      whereClause.category = category;
    }

    let stockItems: StockItem[];

    if (search) {
      const pattern = ILike(`%${search}%`);
      stockItems = await this.stockItemRepo.find({
        where: [
          { ...whereClause, name: pattern },
          { ...whereClause, sku: pattern },
        ],
        relations: ["locationEntity"],
        order: { name: "ASC" },
      });
    } else {
      stockItems = await this.stockItemRepo.find({
        where: whereClause,
        relations: ["locationEntity"],
        order: { name: "ASC" },
      });
    }

    if (stockItems.length === 0) {
      throw new NotFoundException("No stock items found");
    }

    return this.generateBatchStockItemLabelsPdf(stockItems);
  }

  private async generateBatchStockItemLabelsPdf(stockItems: StockItem[]): Promise<Buffer> {
    const mmToPt = (mm: number) => mm * 2.83465;

    const labelWidth = mmToPt(62);
    const labelHeight = mmToPt(30);
    const gap = mmToPt(5);
    const margin = mmToPt(10);
    const labelsPerRow = 3;
    const labelsPerPage = 21;

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    for (let i = 0; i < stockItems.length; i++) {
      const item = stockItems[i];
      const labelIndexOnPage = i % labelsPerPage;

      if (labelIndexOnPage === 0 && i > 0) {
        doc.addPage();
      }

      const col = labelIndexOnPage % labelsPerRow;
      const row = Math.floor(labelIndexOnPage / labelsPerRow);

      const x = margin + col * (labelWidth + gap);
      const y = margin + row * (labelHeight + gap);

      doc.roundedRect(x, y, labelWidth, labelHeight, mmToPt(2)).strokeColor("#d1d5db").stroke();

      const qrSize = mmToPt(22);
      const qrX = x + mmToPt(2);
      const qrY = y + (labelHeight - qrSize) / 2;

      const qrBuffer = await QRCode.toBuffer(`stock:${item.id}`, { width: 150, margin: 1 });
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      const infoX = qrX + qrSize + mmToPt(2);
      const infoWidth = labelWidth - qrSize - mmToPt(6);
      let infoY = y + mmToPt(4);

      doc.fillColor("#111827").fontSize(9).font("Helvetica-Bold");
      const nameHeight = doc.heightOfString(item.name, { width: infoWidth });
      const maxNameHeight = mmToPt(10);
      doc.text(item.name, infoX, infoY, {
        width: infoWidth,
        height: Math.min(nameHeight, maxNameHeight),
        ellipsis: true,
      });
      infoY += Math.min(nameHeight, maxNameHeight) + mmToPt(1);

      doc.fillColor("#0d9488").fontSize(8).font("Courier");
      doc.text(item.sku, infoX, infoY, { width: infoWidth });
      infoY += mmToPt(4);

      const locationName = item.locationEntity?.name ?? item.location ?? "";
      if (locationName) {
        doc.fillColor("#6b7280").fontSize(7).font("Helvetica");
        doc.text(locationName, infoX, infoY, { width: infoWidth });
      }
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
  }

  private async findStaffMember(staffId: number, companyId: number): Promise<StaffMember> {
    const staff = await this.staffMemberRepo.findOne({
      where: { id: staffId, companyId },
      relations: ["departmentEntity"],
    });
    if (!staff) {
      throw new NotFoundException("Staff member not found");
    }
    return staff;
  }

  private async findStockItem(itemId: number, companyId: number): Promise<StockItem> {
    const item = await this.stockItemRepo.findOne({
      where: { id: itemId, companyId },
    });
    if (!item) {
      throw new NotFoundException("Stock item not found");
    }
    return item;
  }

  private async findJobCard(jobId: number, companyId: number): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobId, companyId },
      relations: ["lineItems"],
    });
    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }
    return jobCard;
  }
}
