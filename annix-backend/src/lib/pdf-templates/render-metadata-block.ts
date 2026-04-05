import { PDF_FONTS } from "../pdf-builder";
import type { MetadataBlockOptions, PdfDoc } from "./types";

export function renderMetadataBlock(doc: PdfDoc, options: MetadataBlockOptions): number {
  const columns = options.columns ?? 1;
  const lineHeight = options.lineHeight ?? 16;
  const fontSize = options.fontSize ?? 9;
  const columnGap = 20;
  const columnWidth = (options.width - columnGap * (columns - 1)) / columns;
  const labelWidth = options.labelWidth ?? Math.floor(columnWidth * 0.45);
  const valueOffset = labelWidth + 8;

  doc.fontSize(fontSize).fillColor("#000000");

  const finalY = options.items.reduce<number>((y, item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const itemX = options.startX + col * (columnWidth + columnGap);
    const itemY = options.startY + row * lineHeight;

    doc.font(PDF_FONTS.REGULAR).text(item.label, itemX, itemY, { width: labelWidth });
    doc.font(PDF_FONTS.BOLD).text(item.value, itemX + valueOffset, itemY, {
      width: columnWidth - valueOffset,
    });

    return Math.max(y, itemY + lineHeight);
  }, options.startY);

  return finalY;
}
