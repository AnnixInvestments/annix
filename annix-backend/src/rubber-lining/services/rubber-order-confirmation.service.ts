import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminCompanyProfileService } from "../../admin/admin-company-profile.service";
import { EmailService } from "../../email/email.service";
import { formatDateZA, now } from "../../lib/datetime";
import { A4_PORTRAIT, createPdfDocument, PDF_FONTS } from "../../lib/pdf-builder";
import { RubberOrder } from "../entities/rubber-order.entity";

interface OrderConfirmationData {
  orderNumber: string;
  reference: string;
  date: string;
  deliveryDate: string;
  salesRep: string;
  overallDiscount: string;
  from: {
    companyName: string;
    vatNumber: string;
    postalAddress: string[];
    deliveryAddress: string[];
  };
  to: {
    companyName: string;
    vatNumber: string;
    postalAddress: string[];
    deliveryAddress: string[];
  };
  lines: {
    description: string;
    quantity: number;
    exclPrice: number;
    discPercent: number;
    vatPercent: number;
    exclTotal: number;
    inclTotal: number;
  }[];
  totalDiscount: number;
  totalExclusive: number;
  totalVat: number;
  subTotal: number;
  grandTotal: number;
}

@Injectable()
export class RubberOrderConfirmationService {
  private readonly logger = new Logger(RubberOrderConfirmationService.name);

  constructor(
    @InjectRepository(RubberOrder)
    private readonly orderRepository: Repository<RubberOrder>,
    private readonly companyProfileService: AdminCompanyProfileService,
    private readonly emailService: EmailService,
  ) {}

  async confirmationPdf(orderId: number): Promise<Buffer> {
    const data = await this.confirmationData(orderId);
    return this.renderPdf(data);
  }

  async sendConfirmation(orderId: number, email: string, cc?: string, bcc?: string): Promise<void> {
    const data = await this.confirmationData(orderId);
    const pdfBuffer = await this.renderPdf(data);

    const disputeNotice =
      "Please note: You have 24 hours from receipt of this email to dispute any errors on the attached Order Confirmation. " +
      "After this period, a 15% handling fee may apply to any cancelled orders.";

    const html = [
      `<p>Dear ${data.to.companyName},</p>`,
      `<p>Please find attached your Order Confirmation (${data.orderNumber}) for your reference: ${data.reference}.</p>`,
      "<p>Please review all line items and confirm they are correct.</p>",
      `<p style="color: #b91c1c; font-weight: bold;">${disputeNotice}</p>`,
      "<p>If you have any queries, please contact us directly.</p>",
      `<p>Kind Regards,<br/>${data.salesRep}<br/>${data.from.companyName}</p>`,
    ].join("\n");

    await this.emailService.sendEmail({
      to: email,
      cc,
      bcc,
      subject: `Order Confirmation - ${data.orderNumber} - ${data.reference}`,
      fromName: data.from.companyName,
      html,
      attachments: [
        {
          filename: `Order-Confirmation-${data.orderNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    this.logger.log(`Sent order confirmation for ${data.orderNumber} to ${email}`);
  }

  private async confirmationData(orderId: number): Promise<OrderConfirmationData> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["company", "items", "items.product"],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const profile = await this.companyProfileService.profile();
    const customer = order.company;
    const customerAddress = customer?.address || {};
    const postalStreet = customerAddress["postalStreet"] || customerAddress["street"] || "";
    const postalCity = customerAddress["postalCity"] || customerAddress["city"] || "";
    const postalProvince = customerAddress["postalProvince"] || customerAddress["province"] || "";
    const postalCode = customerAddress["postalCode"] || "";
    const deliveryStreet = customerAddress["deliveryStreet"] || customerAddress["street"] || "";
    const deliveryCity = customerAddress["deliveryCity"] || customerAddress["city"] || "";
    const deliveryProvince =
      customerAddress["deliveryProvince"] || customerAddress["province"] || "";
    const deliveryCode = customerAddress["deliveryCode"] || customerAddress["postalCode"] || "";

    const vatRate = 0.15;

    const lines = (order.items || []).map((item) => {
      const product = item.product;
      const thickness = Number(item.thickness) || 0;
      const width = Number(item.width) || 0;
      const length = Number(item.length) || 0;
      const quantity = Number(item.quantity) || 0;
      const specificGravity = product ? Number(product.specificGravity) || 1 : 1;
      const kgPerRoll =
        thickness && width && length ? thickness * (width / 1000) * length * specificGravity : 0;
      const pricePerKg = item.pricePerKg != null ? Number(item.pricePerKg) : 0;
      const cpoUnitPrice = item.cpoUnitPrice != null ? Number(item.cpoUnitPrice) : null;
      const pricePerRoll = cpoUnitPrice != null ? cpoUnitPrice : kgPerRoll * pricePerKg;

      const productTitle = product ? product.title || "" : "";
      const desc = [
        productTitle,
        `${thickness}mm x ${width}mm x ${length}m`,
        `${kgPerRoll.toFixed(2)}Kg per Roll`,
        specificGravity ? `S.G ${specificGravity}` : "",
      ]
        .filter(Boolean)
        .join(", ");

      const exclTotal = pricePerRoll * quantity;
      const inclTotal = exclTotal * (1 + vatRate);

      return {
        description: desc,
        quantity,
        exclPrice: pricePerRoll,
        discPercent: 0,
        vatPercent: vatRate * 100,
        exclTotal,
        inclTotal,
      };
    });

    const totalExclusive = lines.reduce((sum, l) => sum + l.exclTotal, 0);
    const totalVat = totalExclusive * vatRate;
    const grandTotal = totalExclusive + totalVat;

    const profileAddress = [
      profile.streetAddress,
      profile.city,
      profile.province,
      profile.postalCode,
    ].filter(Boolean) as string[];

    return {
      orderNumber: order.orderNumber,
      reference: order.companyOrderNumber || "-",
      date: formatDateZA(now().toISO()),
      deliveryDate: "-",
      salesRep: "AU Industries",
      overallDiscount: "0.00%",
      from: {
        companyName: profile.legalName,
        vatNumber: profile.vatNumber || "",
        postalAddress: profileAddress,
        deliveryAddress: profileAddress,
      },
      to: {
        companyName: customer?.name || "Unknown Customer",
        vatNumber: customer?.vatNumber || "",
        postalAddress: [postalStreet, postalCity, postalProvince, postalCode].filter(Boolean),
        deliveryAddress: [deliveryStreet, deliveryCity, deliveryProvince, deliveryCode].filter(
          Boolean,
        ),
      },
      lines,
      totalDiscount: 0,
      totalExclusive,
      totalVat,
      subTotal: grandTotal,
      grandTotal,
    };
  }

  private async renderPdf(data: OrderConfirmationData): Promise<Buffer> {
    const layout = A4_PORTRAIT;
    const { doc, toBuffer } = createPdfDocument({ margin: layout.margin });
    const left = layout.margin;
    const right = layout.pageWidth - layout.margin;
    const contentW = right - left;
    let y = layout.margin;

    doc.font(PDF_FONTS.BOLD).fontSize(14).text("ORDER CONFIRMATION", left, y);
    y += 22;

    const headerFields = [
      ["NUMBER:", data.orderNumber],
      ["REFERENCE:", data.reference],
      ["DATE:", data.date],
      ["DELIVERY DATE:", data.deliveryDate],
      ["SALES REP:", data.salesRep],
      ["OVERALL DISCOUNT %:", data.overallDiscount],
      ["PAGE:", "1/1"],
    ];

    doc.font(PDF_FONTS.BOLD).fontSize(7);
    for (const [label, value] of headerFields) {
      doc.text(label, left, y, { width: 110, align: "left" });
      doc.font(PDF_FONTS.REGULAR).text(value, left + 110, y, { width: 140, align: "right" });
      doc.font(PDF_FONTS.BOLD);
      y += 10;
    }

    y += 10;

    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).stroke();
    y += 8;

    const midX = left + contentW / 2;

    doc.font(PDF_FONTS.BOLD).fontSize(7).text("FROM", left, y);
    doc.text("TO", midX, y);
    y += 10;

    doc.font(PDF_FONTS.BOLD).fontSize(8);
    doc.text(data.from.companyName.toUpperCase(), left, y);
    doc.text(data.to.companyName.toUpperCase(), midX, y);
    y += 12;

    doc.font(PDF_FONTS.BOLD).fontSize(7);
    doc.text("VAT NO:", left, y, { continued: true });
    doc.font(PDF_FONTS.REGULAR).text(`  ${data.from.vatNumber}`);
    doc.font(PDF_FONTS.BOLD).text("CUSTOMER VAT NO:", midX, y, { continued: true });
    doc.font(PDF_FONTS.REGULAR).text(`  ${data.to.vatNumber}`);
    y += 10;

    const addressStartY = y;

    doc.font(PDF_FONTS.BOLD).fontSize(7).text("POSTAL ADDRESS:", left, y);
    doc.text("POSTAL ADDRESS:", midX, y);
    y += 10;
    doc.font(PDF_FONTS.REGULAR);
    for (const line of data.from.postalAddress) {
      doc.text(line, left, y);
      y += 9;
    }

    let ry = addressStartY + 10;
    doc.font(PDF_FONTS.REGULAR);
    for (const line of data.to.postalAddress) {
      doc.text(line, midX, ry);
      ry += 9;
    }

    y = Math.max(y, ry) + 5;

    const deliveryLabelY = y;
    doc.font(PDF_FONTS.BOLD).fontSize(7);
    doc.text("DELIVERY ADDRESS:", left + 130, deliveryLabelY);
    doc.text("DELIVERY ADDRESS:", midX + 130, deliveryLabelY);
    y += 10;

    doc.font(PDF_FONTS.REGULAR);
    let dy1 = y;
    for (const line of data.from.deliveryAddress) {
      doc.text(line, left + 130, dy1);
      dy1 += 9;
    }
    let dy2 = y;
    for (const line of data.to.deliveryAddress) {
      doc.text(line, midX + 130, dy2);
      dy2 += 9;
    }

    y = Math.max(dy1, dy2) + 10;

    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).stroke();
    y += 5;

    const cols = [
      { label: "Description", x: left, w: 200 },
      { label: "Quantity", x: left + 205, w: 50 },
      { label: "Excl. Price", x: left + 260, w: 65 },
      { label: "Disc %", x: left + 330, w: 40 },
      { label: "VAT %", x: left + 375, w: 40 },
      { label: "Excl. Total", x: left + 420, w: 65 },
      { label: "Incl. Total", x: right - 75, w: 75 },
    ];

    doc.font(PDF_FONTS.BOLD).fontSize(7);
    for (const col of cols) {
      doc.text(col.label, col.x, y, { width: col.w, align: col.x === left ? "left" : "right" });
    }
    y += 12;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.3).stroke();
    y += 5;

    doc.font(PDF_FONTS.REGULAR).fontSize(7);
    for (const line of data.lines) {
      const lineHeight = doc.heightOfString(line.description, { width: 200 });
      const rowH = Math.max(lineHeight, 12);

      doc.text(line.description, cols[0].x, y, { width: cols[0].w });
      doc.text(line.quantity.toFixed(2), cols[1].x, y, { width: cols[1].w, align: "right" });
      doc.text(formatRand(line.exclPrice), cols[2].x, y, { width: cols[2].w, align: "right" });
      doc.text(`${line.discPercent.toFixed(2)}%`, cols[3].x, y, {
        width: cols[3].w,
        align: "right",
      });
      doc.text(`${line.vatPercent.toFixed(2)}%`, cols[4].x, y, {
        width: cols[4].w,
        align: "right",
      });
      doc.text(formatRand(line.exclTotal), cols[5].x, y, { width: cols[5].w, align: "right" });
      doc.text(formatRand(line.inclTotal), cols[6].x, y, { width: cols[6].w, align: "right" });
      y += rowH + 8;
    }

    const footerY = layout.pageHeight - layout.margin - 120;
    y = Math.max(y + 20, footerY);

    doc.font(PDF_FONTS.REGULAR).fontSize(7);
    doc.text(
      "Good Day. Please find attached your order confirmation. Please check if all lines are " +
        "correct within 1 business day of receiving this email. If you have any queries, please direct " +
        "them to the email address above.",
      left,
      y,
      { width: contentW / 2 - 20 },
    );

    const totalsX = right - 180;
    const totalsValX = right - 80;
    doc.font(PDF_FONTS.BOLD).fontSize(7);
    doc.text("Total Discount:", totalsX, y, { width: 100, align: "right" });
    doc
      .font(PDF_FONTS.REGULAR)
      .text(formatRand(data.totalDiscount), totalsValX, y, { width: 80, align: "right" });
    y += 10;
    doc.font(PDF_FONTS.BOLD).text("Total Exclusive:", totalsX, y, { width: 100, align: "right" });
    doc
      .font(PDF_FONTS.REGULAR)
      .text(formatRand(data.totalExclusive), totalsValX, y, { width: 80, align: "right" });
    y += 10;
    doc.font(PDF_FONTS.BOLD).text("Total VAT:", totalsX, y, { width: 100, align: "right" });
    doc
      .font(PDF_FONTS.REGULAR)
      .text(formatRand(data.totalVat), totalsValX, y, { width: 80, align: "right" });
    y += 10;
    doc.font(PDF_FONTS.BOLD).text("Sub Total:", totalsX, y, { width: 100, align: "right" });
    doc
      .font(PDF_FONTS.REGULAR)
      .text(formatRand(data.subTotal), totalsValX, y, { width: 80, align: "right" });
    y += 15;

    doc.moveTo(totalsX, y).lineTo(right, y).lineWidth(0.5).stroke();
    y += 5;
    doc
      .font(PDF_FONTS.BOLD)
      .fontSize(8)
      .text("Grand Total:", totalsX, y, { width: 100, align: "right" });
    doc.text(formatRand(data.grandTotal), totalsValX, y, { width: 80, align: "right" });
    y += 15;

    doc
      .font(PDF_FONTS.BOLD)
      .fontSize(7)
      .text("BALANCE DUE", totalsX, y, { width: 100, align: "right" });
    doc
      .fontSize(10)
      .text(formatRand(data.grandTotal), totalsValX, y, { width: 80, align: "right" });

    return toBuffer();
  }
}

function formatRand(value: number): string {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
