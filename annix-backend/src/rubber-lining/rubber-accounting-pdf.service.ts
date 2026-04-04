import { Injectable, Logger } from "@nestjs/common";
import { createPdfDocument } from "../lib/pdf-builder";
import type { MonthlyAccountDataDto } from "./rubber-accounting.service";

@Injectable()
export class RubberAccountingPdfService {
  private readonly logger = new Logger(RubberAccountingPdfService.name);

  async generateAccountsPdf(data: MonthlyAccountDataDto): Promise<Buffer> {
    const { doc, toBuffer } = createPdfDocument({ layout: "landscape", margin: 40 });

    const typeLabel = data.accountType === "PAYABLE" ? "Accounts Payable" : "Accounts Receivable";
    const periodLabel = `${data.year}-${String(data.month).padStart(2, "0")}`;
    const entityLabel = data.accountType === "PAYABLE" ? "Supplier" : "Customer";

    doc.fontSize(16).font("Helvetica-Bold").text(`Monthly ${typeLabel}`, { align: "center" });
    doc.fontSize(11).font("Helvetica").text(`Period: ${periodLabel}`, { align: "center" });
    doc.moveDown(1);

    const colX = {
      name: 40,
      invoiceNo: 200,
      amount: 340,
      credit: 430,
      balance: 520,
      discount: 600,
      vat: 670,
      payable: 740,
    };
    const rightAlign = { width: 70, align: "right" } as const;

    data.companies.forEach((company) => {
      if (doc.y > 480) doc.addPage();

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#1a1a1a")
        .text(company.companyName, colX.name, doc.y);
      if (company.discountPercent > 0) {
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#666666")
          .text(`Disc: ${company.discountPercent}%`, colX.discount, doc.y - 12);
      }
      doc.moveDown(0.3);

      const headerY = doc.y;
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#333333");
      doc.text("Invoice No", colX.invoiceNo, headerY);
      doc.text("Amount", colX.amount, headerY, rightAlign);
      doc.text("Credit", colX.credit, headerY, rightAlign);
      doc.text("Balance", colX.balance, headerY, rightAlign);
      doc.text("Disc", colX.discount, headerY, rightAlign);
      doc.text("VAT", colX.vat, headerY, rightAlign);
      doc.text("Payable", colX.payable, headerY, rightAlign);
      doc.moveDown(0.5);

      doc
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .moveTo(colX.invoiceNo, doc.y)
        .lineTo(810, doc.y)
        .stroke();
      doc.moveDown(0.2);

      doc.fontSize(8).font("Helvetica").fillColor("#000000");
      company.invoices.forEach((inv) => {
        if (doc.y > 520) doc.addPage();
        const y = doc.y;
        doc.text(inv.invoiceNumber, colX.invoiceNo, y);
        if (inv.isCreditNote) {
          doc.text(`(${Math.abs(inv.totalAmount).toFixed(2)})`, colX.credit, y, rightAlign);
        } else {
          doc.text(inv.totalAmount.toFixed(2), colX.amount, y, rightAlign);
        }
        doc.moveDown(0.4);
      });

      const subY = doc.y;
      doc
        .strokeColor("#999999")
        .lineWidth(0.5)
        .moveTo(colX.amount, subY)
        .lineTo(810, subY)
        .stroke();
      doc.moveDown(0.2);

      doc.fontSize(8).font("Helvetica-Bold");
      const totalY = doc.y;
      doc.text("Subtotal", colX.invoiceNo, totalY);
      doc.text(company.subtotal.toFixed(2), colX.amount, totalY, rightAlign);
      doc.text(
        company.creditTotal > 0 ? `(${company.creditTotal.toFixed(2)})` : "-",
        colX.credit,
        totalY,
        rightAlign,
      );
      doc.text(company.balance.toFixed(2), colX.balance, totalY, rightAlign);
      doc.text(
        company.discountAmount > 0 ? `(${company.discountAmount.toFixed(2)})` : "-",
        colX.discount,
        totalY,
        rightAlign,
      );
      doc.text(company.vatTotal.toFixed(2), colX.vat, totalY, rightAlign);
      doc.text(company.amountPayable.toFixed(2), colX.payable, totalY, rightAlign);
      doc.moveDown(1.2);
    });

    if (doc.y > 440) doc.addPage();
    doc.moveDown(1);

    doc.strokeColor("#333333").lineWidth(1).moveTo(40, doc.y).lineTo(810, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");

    const summaryHeaderY = doc.y;
    doc.text(entityLabel, colX.name, summaryHeaderY);
    doc.text("Total", colX.balance, summaryHeaderY, rightAlign);
    doc.text("VAT", colX.vat, summaryHeaderY, rightAlign);
    doc.text("Payable", colX.payable, summaryHeaderY, rightAlign);
    doc.moveDown(0.5);

    doc.fontSize(9).font("Helvetica");
    data.companies.forEach((company) => {
      const y = doc.y;
      doc.text(company.companyName, colX.name, y);
      doc.text(company.balance.toFixed(2), colX.balance, y, rightAlign);
      doc.text(company.vatTotal.toFixed(2), colX.vat, y, rightAlign);
      doc.text(company.amountPayable.toFixed(2), colX.payable, y, rightAlign);
      doc.moveDown(0.4);
    });

    doc.strokeColor("#333333").lineWidth(1).moveTo(colX.balance, doc.y).lineTo(810, doc.y).stroke();
    doc.moveDown(0.3);

    doc.fontSize(10).font("Helvetica-Bold");
    const grandY = doc.y;
    doc.text("GRAND TOTAL", colX.name, grandY);
    doc.text(data.grandTotal.toFixed(2), colX.balance, grandY, rightAlign);
    doc.text(data.grandVat.toFixed(2), colX.vat, grandY, rightAlign);
    doc.text(data.grandPayable.toFixed(2), colX.payable, grandY, rightAlign);

    doc.moveDown(3);
    doc.fontSize(9).font("Helvetica").fillColor("#666666").text("Director Sign-Off:", 40, doc.y);
    doc.moveDown(1.5);
    doc.text(
      "Name: _______________________________     Signature: _______________________________     Date: _______________",
    );

    return toBuffer();
  }
}
