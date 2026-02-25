import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import { ConfigService } from "@nestjs/config";
import { JobCard } from "../entities/job-card.entity";
import { JobCardApproval, ApprovalStatus } from "../entities/job-card-approval.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { formatDateLongZA } from "../../lib/datetime";

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
      where: { jobCardId, companyId, status: ApprovalStatus.APPROVED },
      order: { approvedAt: "ASC" },
    });

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const qrUrl = `${frontendUrl}/stock-control/portal/job-cards/${jobCardId}/dispatch`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1 });

    const buffer = await this.createPdf(jobCard, company, approvals, qrDataUrl);
    const filename = `JC-${jobCard.jobNumber}-${jobCard.id}.pdf`;

    return { buffer, filename };
  }

  private async createPdf(
    jobCard: JobCard,
    company: StockControlCompany | null,
    approvals: JobCardApproval[],
    qrDataUrl: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      this.drawHeader(doc, company, jobCard);
      this.drawJobCardDetails(doc, jobCard);
      this.drawQrCode(doc, qrDataUrl);
      this.drawLineItems(doc, jobCard);
      this.drawAllocations(doc, jobCard);
      this.drawApprovals(doc, approvals);
      this.drawFooter(doc);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument, company: StockControlCompany | null, jobCard: JobCard): void {
    const companyName = company?.name || "Stock Control";

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(companyName, 50, 50, { align: "left" })
      .fontSize(14)
      .font("Helvetica")
      .text("JOB CARD", 50, 75, { align: "left" });

    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(jobCard.jobNumber, 400, 50, { align: "right" });

    if (jobCard.jcNumber) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`JC: ${jobCard.jcNumber}`, 400, 80, { align: "right" });
    }

    doc.moveTo(50, 100).lineTo(545, 100).stroke();
  }

  private drawJobCardDetails(doc: PDFKit.PDFDocument, jobCard: JobCard): void {
    let y = 115;
    const leftCol = 50;
    const rightCol = 300;

    doc.fontSize(10).font("Helvetica-Bold");

    const details = [
      { label: "Job Name:", value: jobCard.jobName, col: leftCol },
      { label: "Status:", value: jobCard.workflowStatus.replace(/_/g, " ").toUpperCase(), col: rightCol },
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

    if (jobCard.notes) {
      const descHeight = jobCard.description ? 30 + Math.ceil(jobCard.description.length / 80) * 12 : 0;
      y += descHeight + 20;
      doc
        .font("Helvetica-Bold")
        .text("Notes:", leftCol, y)
        .font("Helvetica")
        .text(jobCard.notes, leftCol, y + 15, { width: 495 });
    }
  }

  private drawQrCode(doc: PDFKit.PDFDocument, qrDataUrl: string): void {
    const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
    doc.image(qrBuffer, 450, 115, { width: 90, height: 90 });

    doc
      .fontSize(8)
      .font("Helvetica")
      .text("Scan to dispatch", 450, 210, { width: 90, align: "center" });
  }

  private drawLineItems(doc: PDFKit.PDFDocument, jobCard: JobCard): void {
    if (!jobCard.lineItems || jobCard.lineItems.length === 0) {
      return;
    }

    const startY = 280;
    doc.moveTo(50, startY - 10).lineTo(545, startY - 10).stroke();

    doc.fontSize(12).font("Helvetica-Bold").text("Line Items", 50, startY);

    let y = startY + 20;

    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Item Code", 50, y);
    doc.text("Description", 130, y);
    doc.text("Qty", 400, y);
    doc.text("JT No", 450, y);

    y += 15;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 5;

    doc.font("Helvetica").fontSize(8);
    jobCard.lineItems.slice(0, 15).forEach((item) => {
      doc.text(item.itemCode || "-", 50, y, { width: 75 });
      doc.text(item.itemDescription || "-", 130, y, { width: 260 });
      doc.text(String(item.quantity || "-"), 400, y);
      doc.text(item.jtNo || "-", 450, y);
      y += 15;
    });

    if (jobCard.lineItems.length > 15) {
      doc.text(`... and ${jobCard.lineItems.length - 15} more items`, 50, y);
    }
  }

  private drawAllocations(doc: PDFKit.PDFDocument, jobCard: JobCard): void {
    if (!jobCard.allocations || jobCard.allocations.length === 0) {
      return;
    }

    const startY = 500;
    doc.moveTo(50, startY - 10).lineTo(545, startY - 10).stroke();

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
  }

  private drawApprovals(doc: PDFKit.PDFDocument, approvals: JobCardApproval[]): void {
    if (approvals.length === 0) {
      return;
    }

    const startY = 650;
    doc.moveTo(50, startY - 10).lineTo(545, startY - 10).stroke();

    doc.fontSize(12).font("Helvetica-Bold").text("Approvals", 50, startY);

    let y = startY + 20;

    approvals.forEach((approval) => {
      const stepName = approval.step.replace(/_/g, " ");
      const date = approval.approvedAt
        ? formatDateLongZA(approval.approvedAt)
        : "-";

      doc.fontSize(9).font("Helvetica-Bold").text(stepName, 50, y);
      doc.font("Helvetica").text(`${approval.approvedByName || "Unknown"} - ${date}`, 180, y);

      if (approval.signatureUrl) {
        doc.fontSize(8).fillColor("blue").text("[Signed]", 450, y).fillColor("black");
      }

      y += 18;
    });
  }

  private drawFooter(doc: PDFKit.PDFDocument): void {
    const pageHeight = doc.page.height;

    doc
      .fontSize(8)
      .font("Helvetica")
      .text(
        `Generated: ${formatDateLongZA(new Date())}`,
        50,
        pageHeight - 50,
        { align: "center", width: 495 },
      );

    doc.text("Page 1 of 1", 50, pageHeight - 35, { align: "center", width: 495 });
  }
}
