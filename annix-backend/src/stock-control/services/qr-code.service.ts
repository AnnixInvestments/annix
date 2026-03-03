import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import { ILike, In, Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
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
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingAnalysisRepo: Repository<JobCardCoatingAnalysis>,
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
    const qrBuffer = await QRCode.toBuffer(`job:${jobId}`, { width: 200, margin: 2 });

    const coatingAnalysis = await this.coatingAnalysisRepo.findOne({
      where: { jobCardId: jobId, companyId },
    });

    const lineItems = (jobCard.lineItems ?? []).sort((a, b) => a.sortOrder - b.sortOrder);

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
      doc.fillColor("#111827").fontSize(11).font("Helvetica-Bold");
      doc.text("Coating Specification", margin, y);
      y += mmToPt(5);

      const coatColWidths = [260, 65, 75, 70];
      const coatHeaders = ["Product", "DFT (μm)", "Coverage (m²/L)", "Allowed Litres"];
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
        doc.text(coat.litersRequired.toFixed(2), xPos, y + 4, {
          width: coatColWidths[3] - 6,
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
      y += mmToPt(8);
    }

    doc.fillColor("#6b7280").fontSize(7).font("Helvetica-Bold");
    doc.text("NOTES", margin, y);
    y += mmToPt(3);
    doc.roundedRect(margin, y, contentWidth, mmToPt(30)).strokeColor("#d1d5db").stroke();

    if (jobCard.notes) {
      doc.fillColor("#111827").fontSize(9).font("Helvetica");
      doc.text(jobCard.notes, margin + 5, y + 5, { width: contentWidth - 10, height: mmToPt(28) });
    }

    y += mmToPt(35);
    doc
      .moveTo(margin, y)
      .lineTo(margin + contentWidth, y)
      .strokeColor("#e5e7eb")
      .stroke();
    y += 5;
    doc.fillColor("#9ca3af").fontSize(7).font("Helvetica");
    doc.text("Generated from Stock Control System", margin, y, {
      width: contentWidth,
      align: "center",
    });

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
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

    const labelsHtml = await Promise.all(
      stockItems.map(async (item) => {
        const qrDataUrl = await QRCode.toDataURL(`stock:${item.id}`, {
          width: 200,
          margin: 1,
        });
        const locationName = item.locationEntity?.name ?? item.location ?? "";
        return `
          <div class="label">
            <div class="qr"><img src="${qrDataUrl}" /></div>
            <div class="info">
              <div class="name">${escapeHtml(item.name)}</div>
              <div class="sku">${escapeHtml(item.sku)}</div>
              ${locationName ? `<div class="location">${escapeHtml(locationName)}</div>` : ""}
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
    .labels-container { display: flex; flex-wrap: wrap; gap: 5mm; }
    .label { width: 62mm; height: 30mm; border: 1px solid #d1d5db; border-radius: 2mm; overflow: hidden; page-break-inside: avoid; display: flex; padding: 2mm; box-sizing: border-box; }
    .qr { width: 24mm; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .qr img { width: 22mm; height: 22mm; }
    .info { flex: 1; padding-left: 2mm; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
    .name { font-size: 9pt; font-weight: bold; color: #111827; line-height: 1.2; margin-bottom: 1mm; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .sku { font-size: 8pt; font-family: monospace; color: #0d9488; margin-bottom: 1mm; }
    .location { font-size: 7pt; color: #6b7280; }
  </style>
</head>
<body>
  <div class="labels-container">
    ${labelsHtml.join("")}
  </div>
</body>
</html>`;

    return this.htmlToPdf(html, { format: "A4" });
  }

  private buildCoatingSpecHtml(coatingAnalysis: JobCardCoatingAnalysis | null): string {
    if (!coatingAnalysis || !coatingAnalysis.coats || coatingAnalysis.coats.length === 0) {
      return "";
    }

    const coatsRows = coatingAnalysis.coats
      .map(
        (coat) => `
        <tr>
          <td>${escapeHtml(coat.product)}</td>
          <td class="right">${coat.minDftUm}-${coat.maxDftUm}</td>
          <td class="right">${coat.coverageM2PerLiter.toFixed(2)}</td>
          <td class="right">${coat.litersRequired.toFixed(2)}</td>
        </tr>`,
      )
      .join("");

    return `
  <div class="section-title">Coating Specification</div>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align: right;">DFT (µm)</th>
        <th style="text-align: right;">Coverage (m²/L)</th>
        <th style="text-align: right;">Allowed Litres</th>
      </tr>
    </thead>
    <tbody>
      ${coatsRows}
    </tbody>
  </table>`;
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
      this.logger.log("Launching puppeteer browser...");
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      this.logger.log(`Using executable path: ${executablePath ?? "bundled"}`);
      browser = await puppeteer.launch({
        headless: "shell",
        timeout: 60000,
        executablePath: executablePath ?? undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-software-rasterizer",
          "--single-process",
          "--no-zygote",
          "--disable-features=VizDisplayCompositor",
        ],
      });
      this.logger.log("Browser launched successfully");

      const page = await browser.newPage();
      page.setDefaultTimeout(30000);
      this.logger.log("Setting page content...");
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
      this.logger.log("Generating PDF...");

      const pdfBuffer = await page.pdf({
        ...(pageOptions.format ? { format: pageOptions.format as "A4" } : {}),
        ...(pageOptions.width ? { width: pageOptions.width, height: pageOptions.height } : {}),
        printBackground: true,
        margin: { top: "0", bottom: "0", left: "0", right: "0" },
        timeout: 30000,
      });

      this.logger.log(`PDF generated successfully: ${pdfBuffer.length} bytes`);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to generate PDF: ${errorMessage}`, error);
      throw new Error(`Failed to generate PDF: ${errorMessage}`);
    } finally {
      if (browser) {
        this.logger.log("Closing browser...");
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
