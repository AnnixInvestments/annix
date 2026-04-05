import { PDF_FONTS } from "../pdf-builder";
import type { HeaderOptions, PdfDoc } from "./types";

export function renderHeader(doc: PdfDoc, options: HeaderOptions): number {
  const x = options.x ?? 40;
  const y = options.y ?? 40;
  const width = options.width ?? 515;
  const logoHeight = options.logoHeight ?? 36;
  const brandColor = options.brandColor ?? "#000000";

  const hasLogo = options.logoBuf !== null && options.logoBuf !== undefined;
  const textX = hasLogo ? x + logoHeight + 12 : x;

  if (hasLogo) {
    try {
      doc.image(options.logoBuf as Buffer, x, y, {
        fit: [logoHeight + 8, logoHeight],
      });
    } catch {
      // logo render failed; fall back to text only
    }
  }

  doc
    .fontSize(18)
    .font(PDF_FONTS.BOLD)
    .fillColor(hasLogo ? brandColor : "#000000")
    .text(options.title, textX, y, {
      width: width - (textX - x) - 60,
      align: "left",
      lineBreak: false,
    })
    .fillColor("#000000");

  if (options.subtitle) {
    doc
      .fontSize(12)
      .font(PDF_FONTS.REGULAR)
      .text(options.subtitle, textX, y + 22, {
        width: width - (textX - x) - 60,
        align: "left",
      });
  }

  const rightImage = options.rightImage ?? null;
  if (rightImage) {
    const imgX = x + width - rightImage.width;
    doc.image(rightImage.buffer, imgX, y, {
      width: rightImage.width,
      height: rightImage.height,
    });
    if (rightImage.caption) {
      doc
        .fontSize(6)
        .font(PDF_FONTS.REGULAR)
        .text(rightImage.caption, imgX - 10, y + rightImage.height + 2, {
          width: rightImage.width + 20,
          align: "center",
        });
    }
  }

  const dividerY = y + Math.max(logoHeight, options.subtitle ? 38 : 22) + 8;
  doc
    .strokeColor(hasLogo ? brandColor : "#000000")
    .moveTo(x, dividerY)
    .lineTo(x + width, dividerY)
    .lineWidth(0.5)
    .stroke()
    .strokeColor("#000000");

  return dividerY + 10;
}
