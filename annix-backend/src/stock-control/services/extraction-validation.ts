import { BadRequestException } from "@nestjs/common";
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

export function validateInvoiceExtraction(parsed: unknown): ExtractedInvoiceData {
  if (typeof parsed !== "object" || parsed === null) {
    throw new BadRequestException("AI extraction produced invalid data structure");
  }
  const data = parsed as Record<string, unknown>;
  return {
    invoiceNumber: validString(data.invoiceNumber, `INV-${Date.now()}`),
    supplierName: validString(data.supplierName, "Unknown Supplier"),
    invoiceDate: typeof data.invoiceDate === "string" ? data.invoiceDate : undefined,
    totalAmount: validPositiveNumber(data.totalAmount, 0),
    vatAmount: validPositiveNumber(data.vatAmount, 0),
    lineItems: validArray<ExtractedLineItem>(data.lineItems),
    deliveryNoteNumbers: validArray<string>(
      data.deliveryNoteNumbers ??
        (typeof data.deliveryNoteNumber === "string" ? [data.deliveryNoteNumber] : []),
    ),
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
    deliveryNoteNumber: validString(data.deliveryNoteNumber, `DN-${Date.now()}`),
    deliveryDate: typeof data.deliveryDate === "string" ? data.deliveryDate : null,
    fromCompany: { name: validString(fromCompany.name, "Unknown Supplier") },
    lineItems: validArray<Record<string, unknown>>(data.lineItems),
  };
}
