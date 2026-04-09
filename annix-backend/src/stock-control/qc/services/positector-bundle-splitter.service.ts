import { Injectable, Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";

export interface SplitReport {
  batchName: string;
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

interface PageInfo {
  pageIndex: number;
  batchName: string | null;
  instrumentType: string | null;
  probeSerial: string | null;
  createdAt: string | null;
}

const BATCH_NAME_PATTERN = /DeFelsko\s+\d+\s+(B\d+)/;

const INSTRUMENT_PATTERN = /PosiTector\s+(DPM|6000\s*\w*|SPG|RTR|SHD[-\s]?A?|200\s*\w*|AT)\s*/i;

const TIMESTAMP_PATTERN = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/;

const SERIAL_PATTERN = /(\d{6,})\s+PosiTector/;

@Injectable()
export class PositectorBundleSplitterService {
  private readonly logger = new Logger(PositectorBundleSplitterService.name);

  async splitBundle(pdfBuffer: Buffer): Promise<BundleSplitResult> {
    const pageTexts = await this.extractPerPageText(pdfBuffer);
    const totalPages = pageTexts.length;
    this.logger.log(`Bundle has ${totalPages} pages, extracting batch assignments`);

    const pageInfos = this.assignPagesToBatches(pageTexts);
    const batchGroups = this.groupByBatch(pageInfos);
    this.logger.log(`Found ${batchGroups.length} batches`);

    const summaryEnd =
      batchGroups.length > 0 ? Math.min(...batchGroups.map((g) => g.pageIndices[0])) : totalPages;

    const srcDoc = await PDFDocument.load(pdfBuffer);
    const reports: SplitReport[] = [];

    for (const group of batchGroups) {
      const subBuffer = await this.extractPageIndices(srcDoc, group.pageIndices);
      const entityType = this.instrumentToEntityType(group.instrumentType || "unknown");
      const firstPage = Math.min(...group.pageIndices);
      const lastPage = Math.max(...group.pageIndices);

      reports.push({
        batchName: group.batchName,
        pageStart: firstPage + 1,
        pageEnd: lastPage + 1,
        pageCount: group.pageIndices.length,
        instrumentType: group.instrumentType || "unknown",
        probeSerial: group.probeSerial,
        createdAt: group.createdAt,
        entityType,
        buffer: subBuffer,
      });
    }

    this.logger.log(
      `Split into ${reports.length} reports: ${reports.map((r) => `${r.batchName}:${r.instrumentType}(p${r.pageStart}-${r.pageEnd})`).join(", ")}`,
    );

    return { totalPages, reports, summaryPageCount: summaryEnd };
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

  private assignPagesToBatches(pageTexts: string[]): PageInfo[] {
    return pageTexts.map((text, pageIndex) => {
      const batchMatch = text.match(BATCH_NAME_PATTERN);
      const instrumentMatch = text.match(INSTRUMENT_PATTERN);
      const serialMatch = text.match(SERIAL_PATTERN);
      const timestampMatch = text.match(TIMESTAMP_PATTERN);

      return {
        pageIndex,
        batchName: batchMatch ? batchMatch[1] : null,
        instrumentType: instrumentMatch ? instrumentMatch[1].trim() : null,
        probeSerial: serialMatch ? serialMatch[1] : null,
        createdAt: timestampMatch ? timestampMatch[1] : null,
      };
    });
  }

  private groupByBatch(pageInfos: PageInfo[]): Array<{
    batchName: string;
    pageIndices: number[];
    instrumentType: string | null;
    probeSerial: string | null;
    createdAt: string | null;
  }> {
    const batchMap = new Map<
      string,
      {
        pageIndices: number[];
        instrumentType: string | null;
        probeSerial: string | null;
        createdAt: string | null;
      }
    >();

    let currentBatch: string | null = null;

    pageInfos.forEach((info) => {
      if (info.batchName) {
        currentBatch = info.batchName;
      }

      if (!currentBatch) {
        return;
      }

      const existing = batchMap.get(currentBatch);
      if (existing) {
        existing.pageIndices.push(info.pageIndex);
        if (info.instrumentType && !existing.instrumentType) {
          existing.instrumentType = info.instrumentType;
        }
        if (info.probeSerial && !existing.probeSerial) {
          existing.probeSerial = info.probeSerial;
        }
        if (info.createdAt && !existing.createdAt) {
          existing.createdAt = info.createdAt;
        }
      } else {
        batchMap.set(currentBatch, {
          pageIndices: [info.pageIndex],
          instrumentType: info.instrumentType,
          probeSerial: info.probeSerial,
          createdAt: info.createdAt,
        });
      }
    });

    return Array.from(batchMap.entries()).map(([batchName, data]) => ({
      batchName,
      ...data,
    }));
  }

  private async extractPageIndices(srcDoc: PDFDocument, pageIndices: number[]): Promise<Buffer> {
    const newDoc = await PDFDocument.create();
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
