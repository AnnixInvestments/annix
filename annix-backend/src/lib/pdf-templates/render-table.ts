import { PDF_FONTS } from "../pdf-builder";
import type { PdfDoc, TableColumn, TableOptions } from "./types";

export function renderTable<Row>(doc: PdfDoc, options: TableOptions<Row>): number {
  const headerBg = options.headerBg ?? "#f5f5f5";
  const headerColor = options.headerColor ?? "#000000";
  const stripeBg = options.stripeBg ?? null;
  const borderColor = options.borderColor ?? "#cccccc";
  const rowHeight = options.rowHeight ?? 16;
  const headerHeight = options.headerHeight ?? rowHeight;
  const fontSize = options.fontSize ?? 8;

  const totalWidth = options.columns.reduce((sum, col) => sum + col.width, 0);

  const columnX = options.columns.reduce<number[]>((acc, col, index) => {
    const prev = index === 0 ? options.startX : acc[index - 1] + options.columns[index - 1].width;
    return [...acc, prev];
  }, []);

  doc
    .rect(options.startX, options.startY, totalWidth, headerHeight)
    .fillAndStroke(headerBg, borderColor);
  doc.fillColor(headerColor).fontSize(fontSize).font(PDF_FONTS.BOLD);

  options.columns.forEach((col: TableColumn<Row>, i) => {
    doc.text(col.header, columnX[i] + 3, options.startY + 3, {
      width: col.width - 6,
      align: col.align ?? "left",
    });
  });

  const finalY = options.rows.reduce<number>((y, row, rowIndex) => {
    if (y + rowHeight > 800 && options.onOverflow) {
      const newY = options.onOverflow(y);
      if (newY !== null) {
        return newY;
      }
    }

    const bg = stripeBg && rowIndex % 2 === 1 ? stripeBg : "#ffffff";
    doc.rect(options.startX, y, totalWidth, rowHeight).fillAndStroke(bg, borderColor);
    doc.fillColor("#000000").font(PDF_FONTS.REGULAR).fontSize(fontSize);

    options.columns.forEach((col: TableColumn<Row>, i) => {
      const value = col.format
        ? col.format(row, rowIndex)
        : String((row as Record<string, unknown>)[col.key] ?? "");
      doc.text(value, columnX[i] + 3, y + 3, {
        width: col.width - 6,
        align: col.align ?? "left",
      });
    });

    return y + rowHeight;
  }, options.startY + headerHeight);

  return finalY;
}
