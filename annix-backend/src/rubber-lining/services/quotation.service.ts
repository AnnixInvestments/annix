import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EmailService } from "../../email/email.service";
import { formatDateZA, now } from "../../lib/datetime";
import { A4_PORTRAIT, createPdfDocument, PDF_FONTS } from "../../lib/pdf-builder";
import { CreateQuotationDto, UpdateQuotationDto } from "../dto/quotation.dto";
import { Quotation } from "../entities/quotation.entity";
import { QuotationRepository } from "../repositories/quotation.repository";
import { RubberAppProfileRepository } from "../repositories/rubber-app-profile.repository";
import { RubberCompanyRepository } from "../repositories/rubber-company.repository";

@Injectable()
export class QuotationService {
  private readonly logger = new Logger(QuotationService.name);

  constructor(
    private readonly quotationRepo: QuotationRepository,
    private readonly emailService: EmailService,
    private readonly companyRepo: RubberCompanyRepository,
    private readonly appProfileRepo: RubberAppProfileRepository,
  ) {}

  async create(dto: CreateQuotationDto): Promise<Quotation> {
    const entity = this.quotationRepo.build({
      customerName: dto.customerName,
      customerAddress: dto.customerAddress ?? null,
      customerPhone: dto.customerPhone ?? null,
      customerEmail: dto.customerEmail ?? null,
      customerVatNumber: dto.customerVatNumber ?? null,
      status: dto.status ?? "Unpaid",
      profit: dto.profit ?? 0,
      validTo: dto.validTo ? new Date(dto.validTo) : null,
      affiliateId: dto.affiliateId ?? null,
      items: dto.items.map((item) => ({
        productCode: item.productCode,
        productDescription: item.productDescription,
        colour: item.colour,
        thickness: item.thickness,
        width: item.width,
        length: item.length,
        rollWeight: item.rollWeight,
        pricePerKg: item.pricePerKg,
        costPrice: item.costPrice ?? 0,
        rollPrice: item.rollPrice,
        quantity: item.quantity,
        linePriceExVat: item.linePriceExVat,
        lineVat: item.lineVat,
        linePriceIncVat: item.linePriceIncVat,
      })),
      subtotal: dto.subtotal,
      vatTotal: dto.vatTotal,
      grandTotal: dto.grandTotal,
      createdAt: now().toJSDate(),
      updatedAt: now().toJSDate(),
    });
    return this.quotationRepo.save(entity);
  }

  async findAll(status?: string): Promise<Quotation[]> {
    const all = await this.quotationRepo.findAll();
    if (status) return all.filter((q) => q.status === status);
    return all;
  }

  async findById(id: number): Promise<Quotation | null> {
    return this.quotationRepo.findById(id);
  }

  async backfillCostPrice(): Promise<{ updated: number }> {
    const all = await this.quotationRepo.findAll();
    let updated = 0;
    for (const q of all) {
      let changed = false;
      for (const item of q.items) {
        if (!item.costPrice) {
          item.costPrice = +(item.pricePerKg * 0.87).toFixed(2);
          changed = true;
        }
      }
      if (changed) {
        q.profit = q.items.reduce(
          (sum, item) => sum + (item.pricePerKg - item.costPrice) * item.rollWeight * item.quantity,
          0,
        );
        await this.quotationRepo.save(q);
        updated++;
      }
    }
    return { updated };
  }

  async update(id: number, dto: UpdateQuotationDto): Promise<Quotation | null> {
    const existing = await this.quotationRepo.findById(id);
    if (!existing) return null;

    if (dto.customerName !== undefined) existing.customerName = dto.customerName;
    if (dto.customerAddress !== undefined) existing.customerAddress = dto.customerAddress ?? null;
    if (dto.customerPhone !== undefined) existing.customerPhone = dto.customerPhone ?? null;
    if (dto.customerEmail !== undefined) existing.customerEmail = dto.customerEmail ?? null;
    if (dto.customerVatNumber !== undefined)
      existing.customerVatNumber = dto.customerVatNumber ?? null;
    if (dto.status !== undefined) existing.status = dto.status;
    if (dto.profit !== undefined) existing.profit = dto.profit;
    if (dto.validTo !== undefined) existing.validTo = dto.validTo ? new Date(dto.validTo) : null;
    if (dto.affiliateId !== undefined) existing.affiliateId = dto.affiliateId ?? null;
    if (dto.items !== undefined) {
      existing.items = dto.items.map((item) => ({
        productCode: item.productCode ?? existing.items.find((i) => true)?.productCode ?? "",
        productDescription: item.productDescription ?? "",
        colour: item.colour ?? "",
        thickness: item.thickness ?? 0,
        width: item.width ?? 0,
        length: item.length ?? 0,
        rollWeight: item.rollWeight ?? 0,
        pricePerKg: item.pricePerKg ?? 0,
        costPrice: item.costPrice ?? 0,
        rollPrice: item.rollPrice ?? 0,
        quantity: item.quantity ?? 0,
        linePriceExVat: item.linePriceExVat ?? 0,
        lineVat: item.lineVat ?? 0,
        linePriceIncVat: item.linePriceIncVat ?? 0,
      }));
    }
    if (dto.subtotal !== undefined) existing.subtotal = dto.subtotal;
    if (dto.vatTotal !== undefined) existing.vatTotal = dto.vatTotal;
    if (dto.grandTotal !== undefined) existing.grandTotal = dto.grandTotal;
    existing.updatedAt = now().toJSDate();

    return this.quotationRepo.save(existing);
  }

  async delete(id: number): Promise<boolean> {
    return this.quotationRepo.delete(id);
  }

  async generatePdf(id: number): Promise<Buffer> {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    const company = await this.companyRepo.findOneByIdOrFail(3);
    const companyAddress = company.address || {};

    const layout = A4_PORTRAIT;
    const { doc, toBuffer } = createPdfDocument({ margin: layout.margin });
    const left = layout.margin;
    const right = layout.pageWidth - layout.margin;
    const contentW = right - left;

    const headerPath = path.join(__dirname, "..", "..", "assets", "au-header.jpg");
    if (fs.existsSync(headerPath)) {
      doc.image(headerPath, left, 28, { width: contentW });
    }
    let y = 160;

    doc
      .font(PDF_FONTS.BOLD)
      .fontSize(18)
      .text("QUOTATION", left, y, { align: "center", width: contentW });
    y += 22;

    const validToStr = quotation.validTo ? formatDateZA(quotation.validTo) : "";
    const metaLine =
      `Quotation #${quotation.id}     Date: ${formatDateZA(quotation.createdAt)}` +
      (validToStr ? `     Valid To: ${validToStr}` : "");
    doc
      .font(PDF_FONTS.REGULAR)
      .fontSize(10)
      .text(metaLine, left, y, { align: "center", width: contentW });
    y += 22;

    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).stroke();
    y += 14;

    const midX = left + contentW / 2;
    const col2X = midX + 15;

    doc.font(PDF_FONTS.BOLD).fontSize(9).text("CUSTOMER", left, y);
    doc.text("AU INDUSTRIES (PTY) LTD", col2X, y);
    y += 14;

    doc.font(PDF_FONTS.REGULAR).fontSize(8);
    const customerLines: string[] = [quotation.customerName];
    if (quotation.customerAddress) {
      const parts = quotation.customerAddress
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      customerLines.push(...parts);
    }
    if (quotation.customerPhone) customerLines.push(`Tel: ${quotation.customerPhone}`);
    if (quotation.customerEmail) customerLines.push(`Email: ${quotation.customerEmail}`);
    if (quotation.customerVatNumber) customerLines.push(`VAT: ${quotation.customerVatNumber}`);

    let cy = y;
    for (const line of customerLines) {
      doc.text(line, left, cy);
      cy += 12;
    }

    const street = companyAddress["street"] || companyAddress["deliveryStreet"] || "";
    const city = companyAddress["city"] || companyAddress["deliveryCity"] || "";
    const province = companyAddress["province"] || companyAddress["deliveryProvince"] || "";
    const code = companyAddress["postalCode"] || companyAddress["deliveryCode"] || "";

    const companyLines: string[] = [company.name];
    if (street) companyLines.push(street);
    const loc = [city, province, code].filter(Boolean).join(", ");
    if (loc) companyLines.push(loc);
    if (company.vatNumber) companyLines.push(`VAT: ${company.vatNumber}`);

    let dy = y;
    for (const line of companyLines) {
      doc.text(line, col2X, dy);
      dy += 12;
    }

    y = Math.max(cy, dy) + 10;

    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).stroke();
    y += 8;

    const cols = [
      { label: "Code", x: left, w: 40 },
      { label: "Product Name", x: left + 40, w: 80 },
      { label: "Colour", x: left + 120, w: 25 },
      { label: "Dimensions", x: left + 145, w: 75 },
      { label: "Roll Wt", x: left + 220, w: 35 },
      { label: "Price/Kg", x: left + 255, w: 40 },
      { label: "Roll Price", x: left + 295, w: 40 },
      { label: "QTY", x: left + 335, w: 30 },
      { label: "Ex VAT", x: left + 365, w: 50 },
      { label: "VAT", x: left + 415, w: 50 },
      { label: "Inc VAT", x: left + 465, w: 50 },
    ];

    doc.font(PDF_FONTS.BOLD).fontSize(6.5);
    for (const col of cols) {
      const leftAlign =
        col.label === "Product Name" || col.label === "Colour" || col.label === "Code";
      doc.text(col.label, col.x, y, { width: col.w, align: leftAlign ? "left" : "right" });
    }
    y += 10;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.3).stroke();
    y += 4;

    doc.font(PDF_FONTS.REGULAR).fontSize(6.5);
    for (const item of quotation.items) {
      doc.text(item.productCode, cols[0].x, y, { width: cols[0].w });
      doc.text(item.productDescription, cols[1].x, y, { width: cols[1].w });
      doc.text(item.colour, cols[2].x, y, { width: cols[2].w });
      const dim = `${item.thickness || 0}mm x ${item.width || 0}mm x ${item.length || 0}m`;
      doc.text(dim, cols[3].x, y, { width: cols[3].w, align: "right" });
      doc.text(item.rollWeight.toFixed(2), cols[4].x, y, { width: cols[4].w, align: "right" });
      doc.text(formatRand(item.pricePerKg), cols[5].x, y, { width: cols[5].w, align: "right" });
      doc.text(formatRand(item.rollPrice), cols[6].x, y, { width: cols[6].w, align: "right" });
      doc.text(String(item.quantity), cols[7].x, y, { width: cols[7].w, align: "right" });
      doc.text(formatRand(item.linePriceExVat), cols[8].x, y, { width: cols[8].w, align: "right" });
      doc.text(formatRand(item.lineVat), cols[9].x, y, { width: cols[9].w, align: "right" });
      doc.text(formatRand(item.linePriceIncVat), cols[10].x, y, {
        width: cols[10].w,
        align: "right",
      });
      y += 14;
    }

    y += 10;

    const totalsX = right - 180;
    const totalsValX = right - 80;

    doc.font(PDF_FONTS.BOLD).fontSize(8);
    doc.text("Subtotal:", totalsX, y, { width: 100, align: "right" });
    doc
      .font(PDF_FONTS.REGULAR)
      .text(formatRand(quotation.subtotal), totalsValX, y, { width: 80, align: "right" });
    y += 14;

    doc.font(PDF_FONTS.BOLD).fontSize(8);
    doc.text("VAT (15%):", totalsX, y, { width: 100, align: "right" });
    doc
      .font(PDF_FONTS.REGULAR)
      .text(formatRand(quotation.vatTotal), totalsValX, y, { width: 80, align: "right" });
    y += 14;

    doc.moveTo(totalsX, y).lineTo(right, y).lineWidth(0.5).stroke();
    y += 6;

    doc.font(PDF_FONTS.BOLD).fontSize(10);
    doc.text("Grand Total:", totalsX, y, { width: 100, align: "right" });
    doc.text(formatRand(quotation.grandTotal), totalsValX, y, { width: 80, align: "right" });

    const footerPath = path.join(__dirname, "..", "..", "assets", "au-footer.jpg");
    if (fs.existsSync(footerPath)) {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc.image(footerPath, left, 785, { width: contentW });
      }
    }

    return toBuffer();
  }

  async sendEmail(id: number, to: string, cc?: string, bcc?: string): Promise<void> {
    const quotation = await this.quotationRepo.findById(id);
    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    const profile = await this.appProfileRepo.findById(1);
    if (profile) {
      this.emailService.configureFromProfile({
        smtpHost: profile.smtpHost,
        smtpPort: profile.smtpPort,
        smtpUser: profile.smtpUser,
        smtpPass: profile.smtpPass,
        smtpFromEmail: profile.smtpFromEmail,
        smtpFromName: profile.smtpFromName,
      });
    }

    const pdfBuffer = await this.generatePdf(id);

    const html = [
      `<p>Dear ${quotation.customerName},</p>`,
      `<p>Please find attached your quotation (#${id}) for your reference.</p>`,
      "<p>If you have any questions regarding this quotation, please do not hesitate to contact us.</p>",
      "<p>Kind Regards,<br/>AU Industries (Pty) Ltd</p>",
    ].join("\n");

    await this.emailService.sendEmail({
      to,
      cc,
      bcc,
      subject: `Quotation - #${id}`,
      html,
      attachments: [
        {
          filename: `Quotation-${id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    this.logger.log(`Sent quotation #${id} to ${to}`);
  }
}

function formatRand(value: number): string {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
