import { Injectable, Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";

export interface SplitReport {
  pageStart: number;
  pageEnd: number;
  pageCount: number;
  instrumentType: string;
  probeSerial: string | null;
  createdAt: string | null;
  entityType: "dft" | "blast_profile" | "shore_hardness" | "environmental" | "unknown";
  buffer: Buffer;
}

export interface BundleSplitResult {
  totalPages: number;
  reports: SplitReport[];
  summaryPageCount: number;
}

interface PageBoundary {
  pageIndex: number;
  instrumentType: string;
  probeSerial: string | null;
  createdAt: string | null;
}

const INSTRUMENT_PATTERN =
  /PosiTector\s+(DPM|6000\s*\w*|SPG|RTR|SHD[-\s]?A?|200\s*\w*|AT)\s*(\d*)/i;

const CREATED_PATTERN = /Created:\s*PosiTector\s+Body\s+S\/N/i;

const TIMESTAMP_PATTERN = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/;

const SERIAL_PATTERN = /(\d{6,})\s+PosiTector/;

@Injectable()
export class PositectorBundleSplitterService {
  private readonly logger = new Logger(PositectorBundleSplitterService.name);

  async splitBundle(pdfBuffer: Buffer): Promise<BundleSplitResult> {
    const pageTexts = await this.extractPerPageText(pdfBuffer);
    const totalPages = pageTexts.length;
    this.logger.log(`Bundle has ${totalPages} pages, extracting report boundaries`);

    const boundaries = this.detectReportBoundaries(pageTexts);
    this.logger.log(`Found ${boundaries.length} report boundaries`);

    const reportRanges = this.buildReportRanges(boundaries, totalPages);

    const summaryEnd = boundaries.length > 0 ? boundaries[0].pageIndex : totalPages;

    const srcDoc = await PDFDocument.load(pdfBuffer);
    const reports: SplitReport[] = [];

    for (const range of reportRanges) {
      const subBuffer = await this.extractPages(srcDoc, range.pageStart, range.pageEnd);
      const entityType = this.instrumentToEntityType(range.instrumentType);

      reports.push({
        pageStart: range.pageStart + 1,
        pageEnd: range.pageEnd + 1,
        pageCount: range.pageEnd - range.pageStart + 1,
        instrumentType: range.instrumentType,
        probeSerial: range.probeSerial,
        createdAt: range.createdAt,
        entityType,
        buffer: subBuffer,
      });
    }

    this.logger.log(
      `Split into ${reports.length} reports: ${reports.map((r) => `${r.instrumentType}(p${r.pageStart}-${r.pageEnd})`).join(", ")}`,
    );

    return {
      totalPages,
      reports,
      summaryPageCount: summaryEnd,
    };
  }

  private async extractPerPageText(pdfBuffer: Buffer): Promise<string[]> {
    const pageTexts: string[] = [];

    const pdfParseModule = require("pdf-parse");
    const pdfParse = pdfParseModule.default ?? pdfParseModule;

    await pdfParse(pdfBuffer, {
      pagerender: (pageData: {
        getTextContent: () => Promise<{
          items: Array<{ str: string }>;
        }>;
      }) => {
        return pageData.getTextContent().then((textContent) => {
          const text = textContent.items.map((item) => item.str).join(" ");
          pageTexts.push(text);
          return text;
        });
      },
    });

    return pageTexts;
  }

  private detectReportBoundaries(pageTexts: string[]): PageBoundary[] {
    const boundaries: PageBoundary[] = [];

    pageTexts.forEach((text, pageIndex) => {
      if (!CREATED_PATTERN.test(text)) {
        return;
      }

      const instrumentMatch = text.match(INSTRUMENT_PATTERN);
      const instrumentType = instrumentMatch ? instrumentMatch[1].trim() : "unknown";

      const serialMatch = text.match(SERIAL_PATTERN);
      const probeSerial = serialMatch ? serialMatch[1] : null;

      const timestampMatch = text.match(TIMESTAMP_PATTERN);
      const createdAt = timestampMatch ? timestampMatch[1] : null;

      boundaries.push({ pageIndex, instrumentType, probeSerial, createdAt });
    });

    return boundaries;
  }

  private buildReportRanges(
    boundaries: PageBoundary[],
    totalPages: number,
  ): Array<{
    pageStart: number;
    pageEnd: number;
    instrumentType: string;
    probeSerial: string | null;
    createdAt: string | null;
  }> {
    return boundaries.map((boundary, idx) => {
      const nextStart = idx + 1 < boundaries.length ? boundaries[idx + 1].pageIndex : totalPages;
      return {
        pageStart: boundary.pageIndex,
        pageEnd: nextStart - 1,
        instrumentType: boundary.instrumentType,
        probeSerial: boundary.probeSerial,
        createdAt: boundary.createdAt,
      };
    });
  }

  private async extractPages(
    srcDoc: PDFDocument,
    startIdx: number,
    endIdx: number,
  ): Promise<Buffer> {
    const newDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: endIdx - startIdx + 1 }, (_, i) => startIdx + i);
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));
    const pdfBytes = await newDoc.save();
    return Buffer.from(pdfBytes);
  }

  private instrumentToEntityType(
    instrumentType: string,
  ): "dft" | "blast_profile" | "shore_hardness" | "environmental" | "unknown" {
    const normalized = instrumentType.toUpperCase();
    if (normalized.includes("6000") || normalized.includes("200")) return "dft";
    if (normalized.includes("SPG") || normalized.includes("RTR")) return "blast_profile";
    if (normalized.includes("SHD")) return "shore_hardness";
    if (normalized.includes("DPM")) return "environmental";
    return "unknown";
  }
}
