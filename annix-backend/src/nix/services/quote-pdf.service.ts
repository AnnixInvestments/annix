import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { PuppeteerPoolService } from "../../shared/services/puppeteer-pool.service";
import { StockControlCompany } from "../../stock-control/entities/stock-control-company.entity";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { QuotePdfSnapshotDto } from "../dto/quote-pdf.dto";
import { NixExtractionSession } from "../entities/nix-extraction-session.entity";

interface LetterheadData {
  companyName: string;
  logoUrl: string | null;
  addressLine: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  phone: string | null;
  email: string | null;
}

interface CustomerData {
  name: string;
  customerCode: string | null;
  addressLines: string[];
  email: string | null;
}

@Injectable()
export class QuotePdfService {
  private readonly logger = new Logger(QuotePdfService.name);

  constructor(
    @InjectRepository(NixExtractionSession)
    private readonly sessionRepo: Repository<NixExtractionSession>,
    @InjectRepository(StockControlCompany)
    private readonly tenantRepo: Repository<StockControlCompany>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
    private readonly puppeteerPool: PuppeteerPoolService,
  ) {}

  async generateQuotePdf(
    sessionId: number,
    companyId: number,
    snapshot: QuotePdfSnapshotDto,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Quote session ${sessionId} not found`);
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: companyId } });
    const letterhead = await this.buildLetterhead(tenant);
    const customer = await this.resolveCustomer(session);

    const html = this.buildHtml({
      letterhead,
      customer,
      quoteRef: session.promotedRef ?? "—",
      formattedDate: this.formatDate(session.createdAt),
      orderNumber: session.customerOrderNumber ?? "",
      deliveryNote: session.deliveryNoteRef ?? "",
      snapshot,
    });

    this.logger.log(`Generating PDF for quote session ${sessionId}`);
    const buffer = await this.puppeteerPool.generatePdfFromHtml(html, {
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });

    const safeRef = (session.promotedRef ?? `session-${sessionId}`).replace(/[^A-Za-z0-9_-]/g, "_");
    return { buffer, filename: `Quote-${safeRef}.pdf` };
  }

  private async buildLetterhead(tenant: StockControlCompany | null): Promise<LetterheadData> {
    if (!tenant) {
      return {
        companyName: "—",
        logoUrl: null,
        addressLine: null,
        registrationNumber: null,
        vatNumber: null,
        phone: null,
        email: null,
      };
    }

    const addressParts: string[] = [];
    const street = tenant.streetAddress;
    const city = tenant.city;
    const postal = tenant.postalCode;
    if (street && street.length > 0) addressParts.push(street);
    if (city && city.length > 0) addressParts.push(city);
    if (postal && postal.length > 0) addressParts.push(postal);

    let logoUrl: string | null = null;
    const rawLogo = tenant.logoUrl;
    if (rawLogo && rawLogo.length > 0) {
      try {
        logoUrl = await this.loadLogoAsDataUrl(rawLogo);
      } catch (err) {
        this.logger.warn(`Failed to inline tenant logo: ${(err as Error).message}`);
      }
    }

    return {
      companyName: tenant.name,
      logoUrl,
      addressLine: addressParts.length > 0 ? addressParts.join(", ") : null,
      registrationNumber: tenant.registrationNumber,
      vatNumber: tenant.vatNumber,
      phone: tenant.phone,
      email: tenant.email,
    };
  }

  private async loadLogoAsDataUrl(rawLogo: string): Promise<string | null> {
    let buffer: Buffer | null = null;
    if (rawLogo.startsWith("http://") || rawLogo.startsWith("https://")) {
      const response = await fetch(rawLogo);
      if (!response.ok) {
        this.logger.warn(`Logo fetch ${rawLogo} returned ${response.status}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = await this.storage.download(rawLogo);
    }
    if (!buffer || buffer.length === 0) return null;
    const mime = detectImageMime(buffer);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }

  private async resolveCustomer(session: NixExtractionSession): Promise<CustomerData | null> {
    const customerCompanyId = session.customerCompanyId;
    if (customerCompanyId != null) {
      const live = await this.companyRepo.findOne({ where: { id: customerCompanyId } });
      if (live) {
        return this.shapeCustomer({
          name: live.name,
          customerCode: live.customerCode,
          streetAddress: live.streetAddress,
          city: live.city,
          province: live.province,
          postalCode: live.postalCode,
          country: null,
          email: live.email,
        });
      }
    }

    const snap = session.customerSnapshot;
    if (snap && typeof snap === "object") {
      const s = snap as Record<string, unknown>;
      return this.shapeCustomer({
        name: typeof s.name === "string" ? s.name : "—",
        customerCode: typeof s.customerCode === "string" ? s.customerCode : null,
        streetAddress: typeof s.streetAddress === "string" ? s.streetAddress : null,
        city: typeof s.city === "string" ? s.city : null,
        province: typeof s.province === "string" ? s.province : null,
        postalCode: typeof s.postalCode === "string" ? s.postalCode : null,
        country: typeof s.country === "string" ? s.country : null,
        email: typeof s.email === "string" ? s.email : null,
      });
    }

    return null;
  }

  private shapeCustomer(fields: {
    name: string;
    customerCode: string | null;
    streetAddress: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string | null;
    email: string | null;
  }): CustomerData {
    const lines = [
      fields.streetAddress,
      fields.city,
      fields.province,
      fields.postalCode,
      fields.country,
    ].filter((p): p is string => Boolean(p && p.length > 0));
    return {
      name: fields.name,
      customerCode: fields.customerCode,
      addressLines: lines,
      email: fields.email,
    };
  }

  private buildHtml(args: {
    letterhead: LetterheadData;
    customer: CustomerData | null;
    quoteRef: string;
    formattedDate: string;
    orderNumber: string;
    deliveryNote: string;
    snapshot: QuotePdfSnapshotDto;
  }): string {
    const { letterhead, customer, quoteRef, formattedDate, orderNumber, deliveryNote, snapshot } =
      args;

    const accountCode = customer ? customer.customerCode : null;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Quote ${escapeHtml(quoteRef)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #111827;
    font-size: 11px;
    line-height: 1.4;
  }
  .article { padding: 12px 4px; }
  .letterhead {
    border-bottom: 2px solid #d1d5db;
    padding-bottom: 12px;
    margin-bottom: 14px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
  .lh-left { display: flex; gap: 10px; align-items: flex-start; }
  .lh-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 4px; }
  .lh-logo-placeholder {
    width: 64px; height: 64px; border-radius: 4px;
    background: #e5e7eb; display: flex; align-items: center; justify-content: center;
    font-size: 10px; color: #6b7280;
  }
  .lh-name { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; margin: 0; }
  .lh-address { font-size: 11px; color: #4b5563; margin: 4px 0 0; }
  .lh-right { text-align: right; }
  .lh-title { font-size: 18px; font-weight: 700; margin: 0; letter-spacing: 0.02em; }
  .lh-page { font-size: 10px; color: #6b7280; margin: 2px 0 0; }
  .lh-meta { font-size: 9px; color: #4b5563; margin-top: 10px; }
  .lh-meta p { margin: 1px 0; }

  .to-block { margin-bottom: 12px; }
  .to-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; font-weight: 500; margin: 0 0 3px; }
  .to-code { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 10px; color: #4b5563; text-transform: uppercase; margin: 0; }
  .to-name { font-size: 12px; font-weight: 600; text-transform: uppercase; margin: 2px 0; }
  .to-line { font-size: 10px; color: #4b5563; margin: 0; }

  .header-strip {
    border-top: 1px solid #d1d5db;
    border-bottom: 1px solid #d1d5db;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    margin-bottom: 10px;
  }
  .header-cell { padding: 4px 6px; border-right: 1px solid #e5e7eb; }
  .header-cell:last-child { border-right: 0; }
  .header-cell .lbl { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }
  .header-cell .val { display: block; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; }

  table.items { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.items thead th {
    text-align: left; padding: 4px 3px; font-weight: 600;
    border-bottom: 1px solid #9ca3af;
  }
  table.items thead th.r { text-align: right; }
  table.items td { padding: 3px; border-bottom: 1px solid #f3f4f6; }
  table.items td.r { text-align: right; font-family: ui-monospace, SFMono-Regular, monospace; }
  table.items td.mark { font-family: ui-monospace, SFMono-Regular, monospace; color: #4b5563; }
  table.items td.line-total { font-weight: 600; }
  .spec-line {
    padding: 3px;
    font-size: 10px; color: #4b5563; text-transform: uppercase; letter-spacing: 0.02em;
  }
  .spec-line.bottom { border-bottom: 1px solid #d1d5db; padding-bottom: 5px; }
  .pool-note { padding: 4px 3px; font-size: 10px; white-space: pre-line; color: #1f2937; border-bottom: 1px solid #d1d5db; }

  .general-notes { font-size: 10px; white-space: pre-line; color: #1f2937; margin: 14px 0 0; }

  .totals { margin-top: 18px; display: flex; justify-content: flex-end; }
  .totals-inner { min-width: 18rem; }
  .totals-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  .totals-row.final { border-bottom: 2px solid #111827; font-weight: 700; font-size: 13px; padding: 5px 0; }
  .totals-amt { font-family: ui-monospace, SFMono-Regular, monospace; }

  .col-code { width: 6%; }
  .col-desc { width: 42%; }
  .col-qty { width: 8%; }
  .col-excl { width: 14%; }
  .col-tax { width: 12%; }
  .col-incl { width: 18%; }
</style>
</head>
<body>
<div class="article">
  ${this.renderLetterhead(letterhead, quoteRef)}
  ${this.renderCustomerBlock(customer)}
  <section class="header-strip">
    ${this.renderHeaderCell("Account", accountCode || "—")}
    ${this.renderHeaderCell("Date", formattedDate)}
    ${this.renderHeaderCell("Order No", orderNumber.length > 0 ? orderNumber : "—")}
    ${this.renderHeaderCell("Delivery Note", deliveryNote.length > 0 ? deliveryNote : "—")}
    ${this.renderHeaderCell("Our Reference", quoteRef)}
  </section>
  ${this.renderItemsTable(snapshot)}
  ${snapshot.generalNotes.length > 0 ? `<p class="general-notes">${escapeHtml(snapshot.generalNotes)}</p>` : ""}
  ${this.renderTotals(snapshot)}
</div>
</body>
</html>`;
  }

  private renderLetterhead(info: LetterheadData, quoteRef: string): string {
    const logo = info.logoUrl
      ? `<img class="lh-logo" src="${escapeAttr(info.logoUrl)}" alt="${escapeAttr(info.companyName)} logo" />`
      : `<div class="lh-logo-placeholder">LOGO</div>`;
    const addressHtml = info.addressLine
      ? `<p class="lh-address">${escapeHtml(info.addressLine)}</p>`
      : "";
    const metaLines: string[] = [];
    if (info.registrationNumber) metaLines.push(`Reg: ${escapeHtml(info.registrationNumber)}`);
    if (info.vatNumber) metaLines.push(`Tax Registration: ${escapeHtml(info.vatNumber)}`);
    if (info.phone) metaLines.push(`Telephone: ${escapeHtml(info.phone)}`);
    if (info.email) metaLines.push(escapeHtml(info.email));
    const metaHtml =
      metaLines.length > 0
        ? `<div class="lh-meta">${metaLines.map((l) => `<p>${l}</p>`).join("")}</div>`
        : "";

    return `<header class="letterhead">
  <div class="lh-left">
    ${logo}
    <div>
      <h1 class="lh-name">${escapeHtml(info.companyName)}</h1>
      ${addressHtml}
    </div>
  </div>
  <div class="lh-right">
    <h2 class="lh-title">Quotation ${escapeHtml(quoteRef)}</h2>
    <p class="lh-page">Page 1 of 1</p>
    ${metaHtml}
  </div>
</header>`;
  }

  private renderCustomerBlock(customer: CustomerData | null): string {
    if (!customer) {
      return `<section class="to-block" style="border:1px solid #fbbf24;background:#fffbeb;padding:8px;border-radius:4px;color:#b45309;font-size:10px;">
  No customer assigned — add one before sending the quote.
</section>`;
    }
    const codeHtml = customer.customerCode
      ? `<p class="to-code">${escapeHtml(customer.customerCode)}</p>`
      : "";
    const addrHtml = customer.addressLines
      .map((line) => `<p class="to-line">${escapeHtml(line)}</p>`)
      .join("");
    const emailHtml = customer.email
      ? `<p class="to-line" style="margin-top:4px;">${escapeHtml(customer.email)}</p>`
      : "";
    return `<section class="to-block">
  <p class="to-label">To:</p>
  ${codeHtml}
  <p class="to-name">${escapeHtml(customer.name)}</p>
  ${addrHtml}
  ${emailHtml}
</section>`;
  }

  private renderHeaderCell(label: string, value: string): string {
    return `<div class="header-cell">
  <span class="lbl">${escapeHtml(label)}</span>
  <span class="val">${escapeHtml(value)}</span>
</div>`;
  }

  private renderItemsTable(snapshot: QuotePdfSnapshotDto): string {
    const rows = snapshot.pools
      .map((pool) => {
        const itemRows = pool.items
          .map(
            (item) => `<tr>
  <td class="mark">${escapeHtml(item.mark)}</td>
  <td>${escapeHtml(item.description)}</td>
  <td class="r">${item.quantity.toFixed(2)}</td>
  <td class="r">${item.unitPrice > 0 ? formatZar(item.unitPrice) : "—"}</td>
  <td class="r">${item.lineExcl > 0 ? formatZar(item.lineTax) : "—"}</td>
  <td class="r line-total">${item.lineExcl > 0 ? formatZar(item.lineIncl) : "—"}</td>
</tr>`,
          )
          .join("");
        const intLine = pool.liningLine
          ? `<tr><td colspan="6" class="spec-line">INT : ${escapeHtml(pool.liningLine)}</td></tr>`
          : "";
        const extLine = pool.coatingLine
          ? `<tr><td colspan="6" class="spec-line bottom">EXT : ${escapeHtml(pool.coatingLine)}</td></tr>`
          : "";
        const noteRow =
          pool.note.length > 0
            ? `<tr><td colspan="6" class="pool-note">${escapeHtml(pool.note)}</td></tr>`
            : "";
        return `${itemRows}${intLine}${extLine}${noteRow}`;
      })
      .join("");

    return `<table class="items">
  <colgroup>
    <col class="col-code" /><col class="col-desc" /><col class="col-qty" />
    <col class="col-excl" /><col class="col-tax" /><col class="col-incl" />
  </colgroup>
  <thead>
    <tr>
      <th>Item Code</th>
      <th>Item Description</th>
      <th class="r">Quantity</th>
      <th class="r">Price (Excl)</th>
      <th class="r">Tax</th>
      <th class="r">Total (Incl)</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
  }

  private renderTotals(snapshot: QuotePdfSnapshotDto): string {
    return `<section class="totals">
  <div class="totals-inner">
    <div class="totals-row"><span>Total (Excl)</span><span class="totals-amt">${formatZar(snapshot.subtotalExcl)}</span></div>
    <div class="totals-row"><span>Tax</span><span class="totals-amt">${formatZar(snapshot.totalTax)}</span></div>
    <div class="totals-row final"><span>Total (Incl)</span><span class="totals-amt">${formatZar(snapshot.totalIncl)}</span></div>
  </div>
</section>`;
  }

  private formatDate(input: Date | string): string {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return String(input);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function detectImageMime(buffer: Buffer): string {
  if (buffer.length >= 8) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    const b2 = buffer[2];
    const b3 = buffer[3];
    if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return "image/png";
    if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) return "image/jpeg";
    if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) return "image/gif";
    if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46) return "image/webp";
  }
  const head = buffer.toString("utf8", 0, Math.min(buffer.length, 200)).trim().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "image/svg+xml";
  return "image/png";
}

function formatZar(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "R 0.00";
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
