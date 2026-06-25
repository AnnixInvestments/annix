import { BadRequestException } from "@nestjs/common";
import { nowMillis } from "../../lib/datetime";
import { ExtractedInvoiceData, ExtractedLineItem } from "../entities/supplier-invoice.entity";

export function validString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

export function validPositiveNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  if (Number.isFinite(num) && num >= 0) {
    return num;
  }
  return fallback;
}

export function validPercentage(value: unknown, fallback: number): number {
  const num = Number(value);
  if (Number.isFinite(num) && num >= 0 && num <= 100) {
    return num;
  }
  return fallback;
}

export function validBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

export function validArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function sanitizeLineItem(raw: unknown): ExtractedLineItem {
  const item = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    lineNumber: validPositiveNumber(item.lineNumber, 0),
    description: validString(item.description, ""),
    sku: typeof item.sku === "string" ? item.sku : undefined,
    quantity: validPositiveNumber(item.quantity, 1),
    unitPrice: validPositiveNumber(item.unitPrice, 0),
    unitType: typeof item.unitType === "string" ? item.unitType : undefined,
    discountPercent: validPercentage(item.discountPercent, 0),
    isPaintPartA: validBoolean(item.isPaintPartA, false),
    isPaintPartB: validBoolean(item.isPaintPartB, false),
    volumeLitresPerPack:
      typeof item.volumeLitresPerPack === "number" ? item.volumeLitresPerPack : null,
  };
}

export function validateInvoiceExtraction(parsed: unknown): ExtractedInvoiceData {
  if (typeof parsed !== "object" || parsed === null) {
    throw new BadRequestException("AI extraction produced invalid data structure");
  }
  const data = parsed as Record<string, unknown>;
  return {
    invoiceNumber: validString(data.invoiceNumber, `INV-${nowMillis()}`),
    supplierName: validString(data.supplierName, "Unknown Supplier"),
    invoiceDate: typeof data.invoiceDate === "string" ? data.invoiceDate : undefined,
    totalAmount: validPositiveNumber(data.totalAmount, 0),
    vatAmount: validPositiveNumber(data.vatAmount, 0),
    lineItems: validArray<unknown>(data.lineItems).map(sanitizeLineItem),
    deliveryNoteNumbers: validArray<unknown>(
      data.deliveryNoteNumbers ??
        (typeof data.deliveryNoteNumber === "string" ? [data.deliveryNoteNumber] : []),
    )
      .filter((dn): dn is string => typeof dn === "string")
      .map((dn) => dn.trim())
      .filter((dn) => dn.length > 0 && dn.length <= 64),
  };
}

export function validateCoatingExtraction(parsed: unknown): {
  coats: Array<Record<string, unknown>>;
  applicationType: string;
  surfacePrep: string | null;
} {
  if (typeof parsed !== "object" || parsed === null) {
    throw new BadRequestException("AI coating extraction produced invalid data structure");
  }
  const data = parsed as Record<string, unknown>;
  return {
    coats: validArray<Record<string, unknown>>(data.coats),
    applicationType: validString(data.applicationType, "external"),
    surfacePrep: typeof data.surfacePrep === "string" ? data.surfacePrep : null,
  };
}

export function validateDeliveryExtraction(parsed: unknown): {
  deliveryNoteNumber: string;
  deliveryDate: string | null;
  fromCompany: { name: string };
  lineItems: Array<Record<string, unknown>>;
} {
  if (typeof parsed !== "object" || parsed === null) {
    throw new BadRequestException("AI delivery extraction produced invalid data structure");
  }
  const data = parsed as Record<string, unknown>;
  const fromCompany =
    typeof data.fromCompany === "object" && data.fromCompany !== null
      ? (data.fromCompany as Record<string, unknown>)
      : {};
  return {
    deliveryNoteNumber: validString(data.deliveryNoteNumber, `DN-${nowMillis()}`),
    deliveryDate: typeof data.deliveryDate === "string" ? data.deliveryDate : null,
    fromCompany: { name: validString(fromCompany.name, "Unknown Supplier") },
    lineItems: validArray<Record<string, unknown>>(data.lineItems),
  };
}
