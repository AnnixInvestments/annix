import { Injectable } from "@nestjs/common";
import type { SageExportInvoice } from "./interfaces/sage-invoice";

const COLUMNS = [
  "InvoiceNumber",
  "SupplierName",
  "InvoiceDate",
  "DueDate",
  "Reference",
  "LineDescription",
  "Quantity",
  "UnitPrice",
  "VatRate",
  "LineTotal",
  "AccountCode",
];

@Injectable()
export class SageExportService {
  generateCsv(invoices: SageExportInvoice[]): Buffer {
    const rows = invoices.flatMap((invoice) =>
      invoice.lineItems.map((item) => [
        invoice.invoiceNumber,
        invoice.supplierName,
        formatDate(invoice.invoiceDate),
        formatDate(invoice.dueDate),
        invoice.reference ?? "",
        item.description,
        String(item.quantity),
        formatAmount(item.unitPrice),
        String(item.vatRate),
        formatAmount(lineTotal(item)),
        item.accountCode,
      ]),
    );

    const header = COLUMNS.join(",");
    const body = rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
    const csv = `${header}\r\n${body}\r\n`;

    return Buffer.from(csv, "utf-8");
  }
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(date: Date | null): string {
  if (date === null) {
    return "";
  }
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatAmount(value: number | null): string {
  if (value === null) {
    return "0.00";
  }
  return value.toFixed(2);
}

function lineTotal(item: { quantity: number; unitPrice: number | null }): number | null {
  if (item.unitPrice === null) {
    return null;
  }
  return item.quantity * item.unitPrice;
}
