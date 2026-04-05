import { A4_LANDSCAPE, A4_PORTRAIT, PDF_FONTS } from "../pdf-builder";
import type { FooterOptions, PdfDoc } from "./types";

export function renderFooter(doc: PdfDoc, options: FooterOptions): void {
  const brandColor = options.brandColor ?? "#0d9488";
  const showBrandBar = options.showBrandBar ?? true;

  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  const startPage = range.start;

  Array.from({ length: totalPages }).forEach((_, i) => {
    const pageIndex = startPage + i;
    doc.switchToPage(pageIndex);

    const pageW =
      (doc.page as { width?: number })?.width ?? options.pageWidth ?? A4_PORTRAIT.pageWidth;
    const pageH =
      (doc.page as { height?: number })?.height ?? options.pageHeight ?? A4_PORTRAIT.pageHeight;
    const isLandscape = pageW > pageH;
    const marginX = options.marginX ?? (isLandscape ? A4_LANDSCAPE.margin : A4_PORTRAIT.margin);
    const contentWidth = pageW - marginX * 2;
    const footerY = pageH - 28;

    doc
      .strokeColor("#d1d5db")
      .lineWidth(0.5)
      .moveTo(marginX, footerY - 4)
      .lineTo(marginX + contentWidth, footerY - 4)
      .stroke();

    doc.fontSize(6).font(PDF_FONTS.REGULAR).fillColor("#9ca3af");
    doc.text(options.companyName, marginX, footerY, {
      width: contentWidth / 3,
      align: "left",
    });

    if (options.extraCenterText) {
      doc.text(options.extraCenterText, marginX + contentWidth / 3, footerY, {
        width: contentWidth / 3,
        align: "center",
      });
    }

    doc.text(`Page ${i + 1} of ${totalPages}`, marginX + (contentWidth * 2) / 3, footerY, {
      width: contentWidth / 3,
      align: "right",
    });

    if (showBrandBar) {
      doc.rect(0, pageH - 4, pageW, 4).fill(brandColor);
    }
  });

  doc.fillColor("#000000");
  doc.lineWidth(1);
}
