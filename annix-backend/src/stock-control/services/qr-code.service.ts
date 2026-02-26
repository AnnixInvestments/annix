import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as QRCode from "qrcode";
import { In, Repository } from "typeorm";
import { JobCard } from "../entities/job-card.entity";
import { StaffMember } from "../entities/staff-member.entity";
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
    const qrDataUrl = await QRCode.toDataURL(`stock:${itemId}`, { width: 300, margin: 2 });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: 210mm 148mm landscape; margin: 0; }
    body { margin: 0; padding: 20mm; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 108mm; box-sizing: border-box; }
    .company { font-size: 10pt; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4mm; }
    .name { font-size: 22pt; font-weight: bold; color: #111827; text-align: center; margin-bottom: 3mm; }
    .sku { font-size: 14pt; font-family: monospace; color: #374151; margin-bottom: 6mm; }
    .qr { margin-bottom: 4mm; }
    .qr img { width: 40mm; height: 40mm; }
    .code { font-size: 9pt; font-family: monospace; color: #9ca3af; margin-bottom: 3mm; }
    .location { font-size: 11pt; color: #4b5563; }
  </style>
</head>
<body>
  <div class="company">Stock Control</div>
  <div class="name">${escapeHtml(item.name)}</div>
  <div class="sku">${escapeHtml(item.sku)}</div>
  <div class="qr"><img src="${qrDataUrl}" /></div>
  <div class="code">stock:${item.id}</div>
  ${item.location ? `<div class="location">${escapeHtml(item.location)}</div>` : ""}
</body>
</html>`;

    return this.htmlToPdf(html, { width: "210mm", height: "148mm" });
  }

  async jobCardPdf(jobId: number, companyId: number): Promise<Buffer> {
    const jobCard = await this.findJobCard(jobId, companyId);
    const qrDataUrl = await QRCode.toDataURL(`job:${jobId}`, { width: 200, margin: 2 });

    const lineItemsHtml = (jobCard.lineItems ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(
        (li, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(li.itemCode ?? "-")}</td>
          <td>${escapeHtml(li.itemDescription ?? "-")}</td>
          <td>${escapeHtml(li.itemNo ?? "-")}</td>
          <td class="right">${li.quantity ?? "-"}</td>
          <td>${escapeHtml(li.jtNo ?? "-")}</td>
        </tr>`,
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 15mm 12mm; font-family: Arial, sans-serif; font-size: 10pt; color: #111827; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; border-bottom: 2px solid #0d9488; padding-bottom: 6mm; }
    .header-left h1 { font-size: 18pt; margin: 0 0 2mm 0; color: #0d9488; }
    .header-left .subtitle { font-size: 10pt; color: #6b7280; }
    .header-right { text-align: right; }
    .header-right img { width: 25mm; height: 25mm; }
    .header-right .code { font-size: 7pt; font-family: monospace; color: #9ca3af; margin-top: 1mm; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin-bottom: 8mm; }
    .details .label { font-size: 8pt; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .details .value { font-size: 10pt; color: #111827; margin-bottom: 2mm; }
    table { width: 100%; border-collapse: collapse; margin-top: 4mm; }
    th { background-color: #f3f4f6; font-weight: 600; text-align: left; padding: 2mm 3mm; border: 1px solid #d1d5db; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; }
    td { padding: 2mm 3mm; border: 1px solid #d1d5db; font-size: 9pt; }
    td.right { text-align: right; }
    .section-title { font-size: 12pt; font-weight: bold; color: #111827; margin-bottom: 3mm; }
    .notes-area { margin-top: 8mm; border: 1px solid #d1d5db; border-radius: 2mm; padding: 4mm; min-height: 25mm; }
    .notes-area .label { font-size: 8pt; font-weight: bold; color: #6b7280; text-transform: uppercase; margin-bottom: 2mm; }
    .footer { margin-top: 10mm; text-align: center; font-size: 8pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 4mm; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Job Card</h1>
      <div class="subtitle">${escapeHtml(jobCard.jobNumber)}${jobCard.jcNumber ? ` | JC ${escapeHtml(jobCard.jcNumber)}` : ""}${jobCard.pageNumber ? ` | Page ${escapeHtml(jobCard.pageNumber)}` : ""}</div>
    </div>
    <div class="header-right">
      <img src="${qrDataUrl}" />
      <div class="code">job:${jobCard.id}</div>
    </div>
  </div>

  <div class="details">
    <div><div class="label">Job Name</div><div class="value">${escapeHtml(jobCard.jobName)}</div></div>
    <div><div class="label">Customer</div><div class="value">${escapeHtml(jobCard.customerName ?? "-")}</div></div>
    ${jobCard.poNumber ? `<div><div class="label">PO Number</div><div class="value">${escapeHtml(jobCard.poNumber)}</div></div>` : ""}
    ${jobCard.siteLocation ? `<div><div class="label">Site / Location</div><div class="value">${escapeHtml(jobCard.siteLocation)}</div></div>` : ""}
    ${jobCard.contactPerson ? `<div><div class="label">Contact Person</div><div class="value">${escapeHtml(jobCard.contactPerson)}</div></div>` : ""}
    ${jobCard.dueDate ? `<div><div class="label">Due Date</div><div class="value">${escapeHtml(jobCard.dueDate)}</div></div>` : ""}
    ${jobCard.reference ? `<div><div class="label">Reference</div><div class="value">${escapeHtml(jobCard.reference)}</div></div>` : ""}
    <div><div class="label">Status</div><div class="value" style="text-transform: capitalize;">${escapeHtml(jobCard.status)}</div></div>
  </div>

  ${
    lineItemsHtml
      ? `
  <div class="section-title">Line Items</div>
  <table>
    <thead>
      <tr>
        <th style="width: 6%;">#</th>
        <th style="width: 14%;">Item Code</th>
        <th>Description</th>
        <th style="width: 12%;">Item No</th>
        <th style="width: 10%; text-align: right;">Qty</th>
        <th style="width: 10%;">JT No</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
    </tbody>
  </table>`
      : ""
  }

  <div class="notes-area">
    <div class="label">Notes</div>
    ${jobCard.notes ? `<div style="font-size: 9pt; white-space: pre-wrap;">${escapeHtml(jobCard.notes)}</div>` : ""}
  </div>

  <div class="footer">
    Generated from Stock Control System
  </div>
</body>
</html>`;

    return this.htmlToPdf(html, { format: "A4" });
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
    const cardsHtml = await Promise.all(
      staffMembers.map(async (staff) => {
        const qrDataUrl = await QRCode.toDataURL(`staff:${staff.qrToken}`, { width: 200, margin: 1 });
        const departmentName = staff.departmentEntity?.name ?? staff.department ?? "";
        return `
          <div class="card">
            <div class="card-header">STAFF ID CARD</div>
            <div class="card-body">
              <div class="photo-section">
                ${staff.photoUrl ? `<img class="photo" src="${staff.photoUrl}" />` : '<div class="photo-placeholder"></div>'}
              </div>
              <div class="info-section">
                <div class="name">${escapeHtml(staff.name)}</div>
                ${staff.employeeNumber ? `<div class="employee-number">${escapeHtml(staff.employeeNumber)}</div>` : ""}
                ${departmentName ? `<div class="department">${escapeHtml(departmentName)}</div>` : ""}
              </div>
              <div class="qr-section">
                <img class="qr" src="${qrDataUrl}" />
              </div>
            </div>
          </div>`;
      }),
    );

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: A4; margin: 10mm; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .cards-container { display: flex; flex-wrap: wrap; gap: 8mm; }
    .card { width: 85mm; height: 54mm; border: 1px solid #d1d5db; border-radius: 3mm; overflow: hidden; page-break-inside: avoid; background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%); }
    .card-header { background: #0d9488; color: white; font-size: 8pt; font-weight: bold; text-align: center; padding: 2mm; letter-spacing: 1px; }
    .card-body { display: flex; padding: 3mm; height: calc(100% - 10mm); box-sizing: border-box; }
    .photo-section { width: 22mm; flex-shrink: 0; }
    .photo { width: 22mm; height: 28mm; object-fit: cover; border-radius: 2mm; border: 1px solid #e5e7eb; }
    .photo-placeholder { width: 22mm; height: 28mm; background: #e5e7eb; border-radius: 2mm; display: flex; align-items: center; justify-content: center; }
    .info-section { flex: 1; padding: 0 3mm; display: flex; flex-direction: column; justify-content: center; }
    .name { font-size: 11pt; font-weight: bold; color: #111827; margin-bottom: 1.5mm; line-height: 1.2; }
    .employee-number { font-size: 9pt; font-family: monospace; color: #0d9488; font-weight: bold; margin-bottom: 1mm; }
    .department { font-size: 8pt; color: #6b7280; }
    .qr-section { width: 22mm; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .qr { width: 20mm; height: 20mm; }
  </style>
</head>
<body>
  <div class="cards-container">
    ${cardsHtml.join("")}
  </div>
</body>
</html>`;

    return this.htmlToPdf(html, { format: "A4" });
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

  private async htmlToPdf(
    html: string,
    pageOptions: { format?: string; width?: string; height?: string },
  ): Promise<Buffer> {
    let puppeteer: typeof import("puppeteer");
    try {
      puppeteer = await import("puppeteer");
    } catch (importError) {
      this.logger.error("Failed to import puppeteer", importError);
      throw new Error("PDF generation is not available");
    }

    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        ...(pageOptions.format ? { format: pageOptions.format as "A4" } : {}),
        ...(pageOptions.width ? { width: pageOptions.width, height: pageOptions.height } : {}),
        printBackground: true,
        margin: { top: "0", bottom: "0", left: "0", right: "0" },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error("Failed to generate PDF", error);
      throw new Error("Failed to generate PDF");
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
