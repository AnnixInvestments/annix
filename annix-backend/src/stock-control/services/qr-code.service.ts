import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { StockItem } from "../entities/stock-item.entity";
import { JobCard } from "../entities/job-card.entity";

export interface QrCodeData {
  type: "stock" | "job";
  id: number;
  name: string;
}

@Injectable()
export class QrCodeService {
  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepository: Repository<StockItem>,
    @InjectRepository(JobCard)
    private readonly jobCardRepository: Repository<JobCard>,
  ) {}

  async stockItemQrCode(companyId: number, itemId: number): Promise<Buffer> {
    const item = await this.stockItemRepository.findOne({
      where: { id: itemId, companyId },
    });

    if (!item) {
      throw new NotFoundException(`Stock item ${itemId} not found`);
    }

    const data: QrCodeData = {
      type: "stock",
      id: item.id,
      name: item.name,
    };

    return QRCode.toBuffer(JSON.stringify(data), {
      errorCorrectionLevel: "M",
      type: "png",
      width: 300,
      margin: 2,
    });
  }

  async stockItemPdf(companyId: number, itemId: number): Promise<Buffer> {
    const item = await this.stockItemRepository.findOne({
      where: { id: itemId, companyId },
    });

    if (!item) {
      throw new NotFoundException(`Stock item ${itemId} not found`);
    }

    const qrBuffer = await this.stockItemQrCode(companyId, itemId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A6", margin: 20 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(16).font("Helvetica-Bold").text("STOCK ITEM", { align: "center" });
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica").text(item.name, { align: "center" });
      doc.moveDown(0.3);

      if (item.sku) {
        doc.fontSize(10).text(`SKU: ${item.sku}`, { align: "center" });
        doc.moveDown(0.3);
      }

      if (item.location) {
        doc.fontSize(10).text(`Location: ${item.location}`, { align: "center" });
        doc.moveDown(0.3);
      }

      doc.moveDown(0.5);
      const qrSize = 150;
      const xPos = (doc.page.width - qrSize) / 2;
      doc.image(qrBuffer, xPos, doc.y, { width: qrSize, height: qrSize });

      doc.y += qrSize + 10;

      doc.fontSize(8).fillColor("#666666").text(`ID: ${item.id}`, { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(7).text("Scan to view or allocate stock", { align: "center" });

      doc.end();
    });
  }

  async jobCardQrCode(companyId: number, jobId: number): Promise<Buffer> {
    const job = await this.jobCardRepository.findOne({
      where: { id: jobId, companyId },
    });

    if (!job) {
      throw new NotFoundException(`Job card ${jobId} not found`);
    }

    const data: QrCodeData = {
      type: "job",
      id: job.id,
      name: job.jobNumber,
    };

    return QRCode.toBuffer(JSON.stringify(data), {
      errorCorrectionLevel: "M",
      type: "png",
      width: 300,
      margin: 2,
    });
  }

  async jobCardPdf(companyId: number, jobId: number): Promise<Buffer> {
    const job = await this.jobCardRepository.findOne({
      where: { id: jobId, companyId },
      relations: ["lineItems"],
    });

    if (!job) {
      throw new NotFoundException(`Job card ${jobId} not found`);
    }

    const qrBuffer = await this.jobCardQrCode(companyId, jobId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).font("Helvetica-Bold").text("JOB CARD", { align: "center" });
      doc.moveDown(0.5);

      doc.fontSize(16).text(job.jobNumber, { align: "center" });
      doc.moveDown(1);

      const qrSize = 120;
      const qrX = doc.page.width - doc.page.margins.right - qrSize;
      const qrY = doc.page.margins.top + 60;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      doc.fontSize(11).font("Helvetica");

      const detailsY = 130;
      doc.y = detailsY;

      const labelWidth = 100;
      const leftMargin = doc.page.margins.left;

      const addField = (label: string, value: string | null | undefined) => {
        if (value) {
          doc.font("Helvetica-Bold").text(`${label}:`, leftMargin, doc.y, { continued: true, width: labelWidth });
          doc.font("Helvetica").text(` ${value}`, { width: 300 });
          doc.moveDown(0.3);
        }
      };

      addField("Job Name", job.jobName);
      addField("Customer", job.customerName);
      addField("PO Number", job.poNumber);
      addField("Site", job.siteLocation);
      addField("Contact", job.contactPerson);
      addField("Due Date", job.dueDate);
      addField("Reference", job.reference);
      addField("Status", job.status?.toUpperCase());

      if (job.description) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").text("Description:", leftMargin);
        doc.font("Helvetica").text(job.description, { width: 400 });
      }

      if (job.lineItems && job.lineItems.length > 0) {
        doc.moveDown(1);
        doc.font("Helvetica-Bold").fontSize(12).text("Line Items", leftMargin);
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const colWidths = [60, 200, 60, 60, 60];
        const headers = ["Item No", "Description", "Qty", "m²", "JT No"];

        doc.fontSize(9).font("Helvetica-Bold");
        let xPos = leftMargin;
        headers.forEach((header, i) => {
          doc.text(header, xPos, tableTop, { width: colWidths[i] });
          xPos += colWidths[i];
        });

        doc.moveTo(leftMargin, tableTop + 15).lineTo(leftMargin + 440, tableTop + 15).stroke();

        doc.font("Helvetica").fontSize(9);
        let rowY = tableTop + 20;

        const sortedItems = [...job.lineItems].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        sortedItems.slice(0, 20).forEach((item) => {
          xPos = leftMargin;
          doc.text(item.itemNo || "-", xPos, rowY, { width: colWidths[0] });
          xPos += colWidths[0];
          doc.text(item.itemDescription || "-", xPos, rowY, { width: colWidths[1] });
          xPos += colWidths[1];
          doc.text(item.quantity?.toString() || "-", xPos, rowY, { width: colWidths[2] });
          xPos += colWidths[2];
          doc.text(item.m2?.toFixed(2) || "-", xPos, rowY, { width: colWidths[3] });
          xPos += colWidths[3];
          doc.text(item.jtNo || "-", xPos, rowY, { width: colWidths[4] });
          rowY += 15;
        });

        if (job.lineItems.length > 20) {
          doc.text(`... and ${job.lineItems.length - 20} more items`, leftMargin, rowY + 5);
        }
      }

      if (job.notes) {
        doc.moveDown(1.5);
        doc.font("Helvetica-Bold").fontSize(11).text("Notes:", leftMargin);
        doc.font("Helvetica").fontSize(10).text(job.notes, { width: 400 });
      }

      doc.moveDown(2);
      doc.fontSize(10).font("Helvetica-Bold").text("Stock Allocation", leftMargin);
      doc.moveDown(0.3);

      const allocTableTop = doc.y;
      doc.moveTo(leftMargin, allocTableTop).lineTo(leftMargin + 440, allocTableTop).stroke();
      doc.moveTo(leftMargin, allocTableTop + 20).lineTo(leftMargin + 440, allocTableTop + 20).stroke();

      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Stock Item", leftMargin + 5, allocTableTop + 5, { width: 150 });
      doc.text("Qty Used", leftMargin + 160, allocTableTop + 5, { width: 60 });
      doc.text("Allocated By", leftMargin + 230, allocTableTop + 5, { width: 100 });
      doc.text("Date", leftMargin + 340, allocTableTop + 5, { width: 100 });

      const emptyRows = 5;
      let allocY = allocTableTop + 20;
      Array.from({ length: emptyRows }).forEach(() => {
        allocY += 20;
        doc.moveTo(leftMargin, allocY).lineTo(leftMargin + 440, allocY).stroke();
      });

      doc.moveTo(leftMargin, allocTableTop).lineTo(leftMargin, allocY).stroke();
      doc.moveTo(leftMargin + 155, allocTableTop).lineTo(leftMargin + 155, allocY).stroke();
      doc.moveTo(leftMargin + 225, allocTableTop).lineTo(leftMargin + 225, allocY).stroke();
      doc.moveTo(leftMargin + 335, allocTableTop).lineTo(leftMargin + 335, allocY).stroke();
      doc.moveTo(leftMargin + 440, allocTableTop).lineTo(leftMargin + 440, allocY).stroke();

      const footerY = doc.page.height - 50;
      doc.fontSize(8).fillColor("#666666").text(`Job ID: ${job.id} | Generated: ${new Date().toLocaleDateString()}`, leftMargin, footerY, { align: "center", width: doc.page.width - 80 });

      doc.end();
    });
  }
}
