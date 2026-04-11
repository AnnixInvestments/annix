import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { formatDateZA } from "../../lib/datetime";
import { StockTake } from "../entities/stock-take.entity";
import { StockTakeService } from "./stock-take.service";

type PDFDoc = InstanceType<typeof PDFDocument>;

interface ExportLineRow {
  productSku: string;
  productName: string;
  expectedQty: number;
  countedQty: number | null;
  varianceQty: number | null;
  expectedValueR: number;
  varianceValueR: number | null;
  varianceCategory: string | null;
}

@Injectable()
export class StockTakeExportService {
  private readonly logger = new Logger(StockTakeExportService.name);

  constructor(private readonly stockTakeService: StockTakeService) {}

  async exportPdf(companyId: number, stockTakeId: number): Promise<Buffer> {
    const stockTake = await this.stockTakeService.byId(companyId, stockTakeId);
    if (!stockTake) {
      throw new NotFoundException(`Stock take ${stockTakeId} not found`);
    }
    return this.buildPdf(stockTake);
  }

  async exportCsv(companyId: number, stockTakeId: number): Promise<string> {
    const stockTake = await this.stockTakeService.byId(companyId, stockTakeId);
    if (!stockTake) {
      throw new NotFoundException(`Stock take ${stockTakeId} not found`);
    }
    return this.buildCsv(stockTake);
  }

  private async buildPdf(stockTake: StockTake): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Stock Take ${stockTake.name}`,
          Author: "Annix Stock Management",
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(18).font("Helvetica-Bold").text("Stock Take Report", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(14).text(stockTake.name, { align: "center" });
      doc.moveDown(0.5);

      doc.fontSize(9).font("Helvetica");
      doc.text(`Period: ${stockTake.periodLabel ?? "—"}`);
      doc.text(`Status: ${stockTake.status}`);
      if (stockTake.snapshotAt) {
        doc.text(`Snapshot taken: ${formatDateZA(stockTake.snapshotAt)}`);
      }
      if (stockTake.postedAt) {
        doc.text(`Posted: ${formatDateZA(stockTake.postedAt)}`);
      }
      doc.moveDown(0.5);

      if (stockTake.valuationBeforeR !== null) {
        doc.text(`Valuation before: R ${stockTake.valuationBeforeR.toFixed(2)}`);
      }
      if (stockTake.valuationAfterR !== null) {
        doc.text(`Valuation after: R ${stockTake.valuationAfterR.toFixed(2)}`);
      }
      if (stockTake.totalVarianceR !== null) {
        doc.text(`Total variance: R ${stockTake.totalVarianceR.toFixed(2)}`);
      }
      if (stockTake.totalVarianceAbsR !== null) {
        doc.text(`Total absolute variance: R ${stockTake.totalVarianceAbsR.toFixed(2)}`);
      }
      doc.moveDown(1);

      doc.fontSize(11).font("Helvetica-Bold").text("Lines");
      doc.moveDown(0.5);

      const rows = this.buildRows(stockTake);
      const colWidths = [60, 180, 50, 50, 60, 60, 80];
      const headers = ["SKU", "Product", "Expected", "Counted", "Variance", "Value R", "Reason"];

      this.drawTableRow(doc, headers, colWidths, true);
      for (const row of rows) {
        this.drawTableRow(
          doc,
          [
            row.productSku,
            row.productName,
            String(row.expectedQty),
            row.countedQty === null ? "—" : String(row.countedQty),
            row.varianceQty === null ? "—" : String(row.varianceQty),
            row.varianceValueR === null ? "—" : row.varianceValueR.toFixed(2),
            row.varianceCategory ?? "—",
          ],
          colWidths,
          false,
        );
      }

      doc.end();
    });
  }

  private buildCsv(stockTake: StockTake): string {
    const headers = [
      "stockTakeId",
      "stockTakeName",
      "lineId",
      "productSku",
      "productName",
      "expectedQty",
      "countedQty",
      "varianceQty",
      "expectedCostPerUnit",
      "expectedValueR",
      "varianceValueR",
      "varianceCategory",
      "varianceReason",
    ];
    const escapeCell = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = (stockTake.lines ?? []).map((line) =>
      [
        stockTake.id,
        stockTake.name,
        line.id,
        line.product?.sku ?? "",
        line.product?.name ?? "",
        line.expectedQty,
        line.countedQty,
        line.varianceQty,
        line.expectedCostPerUnit,
        line.expectedValueR,
        line.varianceValueR,
        line.varianceCategory?.name ?? "",
        line.varianceReason ?? "",
      ]
        .map(escapeCell)
        .join(","),
    );
    return [headers.join(","), ...rows].join("\n");
  }

  private buildRows(stockTake: StockTake): ExportLineRow[] {
    return (stockTake.lines ?? []).map((line) => ({
      productSku: line.product?.sku ?? `#${line.productId}`,
      productName: line.product?.name ?? "—",
      expectedQty: line.expectedQty,
      countedQty: line.countedQty,
      varianceQty: line.varianceQty,
      expectedValueR: line.expectedValueR,
      varianceValueR: line.varianceValueR,
      varianceCategory: line.varianceCategory?.name ?? null,
    }));
  }

  private drawTableRow(doc: PDFDoc, cells: string[], widths: number[], isHeader: boolean): void {
    const startX = doc.x;
    const startY = doc.y;
    const rowHeight = 18;
    if (startY + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    if (isHeader) {
      doc.fontSize(8).font("Helvetica-Bold");
    } else {
      doc.fontSize(8).font("Helvetica");
    }

    let currentX = startX;
    cells.forEach((cell, i) => {
      const width = widths[i] ?? 80;
      doc.text(cell, currentX, doc.y, { width, ellipsis: true, lineBreak: false });
      currentX += width;
    });
    doc.moveDown(0.3);
  }
}
