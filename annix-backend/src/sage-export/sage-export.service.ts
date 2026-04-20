import { Injectable } from "@nestjs/common";
import type { SageExportInvoice, SageExportLineItem } from "./interfaces/sage-invoice";

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

const DEFAULT_PAYMENT_DAYS = 30;

@Injectable()
export class SageExportService {
  generateCsv(invoices: SageExportInvoice[]): Buffer {
    const rows = invoices.flatMap((invoice) => {
      const dueDate = invoice.dueDate ?? addDays(invoice.invoiceDate, DEFAULT_PAYMENT_DAYS);
      const reference = invoice.reference ?? invoice.invoiceNumber;
      const lines = consolidateLineItems(invoice);

      return lines.map((item) => [
        invoice.invoiceNumber,
        invoice.supplierName,
        formatDate(invoice.invoiceDate),
        formatDate(dueDate),
        reference,
        item.description,
        String(item.quantity),
        formatAmount(item.unitPrice),
        String(item.vatRate),
        formatAmount(lineTotal(item)),
        item.accountCode,
      ]);
    });

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

function consolidateLineItems(invoice: SageExportInvoice): SageExportLineItem[] {
  const pricedLines = invoice.lineItems.filter(
    (item) => item.unitPrice !== null && item.unitPrice > 0,
  );

  if (pricedLines.length > 0) {
    return pricedLines;
  }

  if (invoice.totalAmount !== null && invoice.totalAmount > 0) {
    const vatRate = invoice.lineItems[0]?.vatRate ?? 15;
    const accountCode = invoice.lineItems[0]?.accountCode ?? "5000";
    const exclusiveAmount =
      invoice.vatAmount !== null
        ? invoice.totalAmount - invoice.vatAmount
        : invoice.totalAmount / (1 + vatRate / 100);

    return [
      {
        description: `Invoice ${invoice.invoiceNumber} - consolidated`,
        quantity: 1,
        unitPrice: Math.round(exclusiveAmount * 100) / 100,
        vatRate,
        accountCode,
      },
    ];
  }

  return invoice.lineItems;
}

function addDays(date: Date | null, days: number): Date | null {
  if (date === null) {
    return null;
  }
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
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
