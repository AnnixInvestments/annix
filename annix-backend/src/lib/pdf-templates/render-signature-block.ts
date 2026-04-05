import { PDF_FONTS } from "../pdf-builder";
import type { PdfDoc, SignatureBlockOptions } from "./types";

export function renderSignatureBlock(doc: PdfDoc, options: SignatureBlockOptions): number {
  const gap = options.gap ?? 20;
  const lineColor = options.lineColor ?? "#000000";
  const count = options.parties.length;

  if (count === 0) {
    return options.startY;
  }

  const partyWidth = (options.width - gap * (count - 1)) / count;
  const labelHeight = 12;
  const signatureLineY = options.startY + 32;
  const nameY = signatureLineY + 6;
  const dateY = nameY + 14;

  options.parties.forEach((party, index) => {
    const partyX = options.startX + index * (partyWidth + gap);

    doc
      .fontSize(9)
      .font(PDF_FONTS.REGULAR)
      .fillColor("#000000")
      .text(party.label, partyX, options.startY, { width: partyWidth });

    if (party.signatureImg) {
      try {
        doc.image(party.signatureImg, partyX, options.startY + labelHeight, {
          fit: [Math.min(partyWidth, 100), 24],
        });
      } catch {
        // fall through to blank line
      }
    }

    doc
      .strokeColor(lineColor)
      .lineWidth(0.5)
      .moveTo(partyX, signatureLineY)
      .lineTo(partyX + partyWidth, signatureLineY)
      .stroke()
      .strokeColor("#000000");

    doc
      .fontSize(8)
      .font(PDF_FONTS.BOLD)
      .text(party.name ?? "", partyX, nameY, { width: partyWidth });

    if (party.date) {
      doc
        .fontSize(8)
        .font(PDF_FONTS.REGULAR)
        .text(`Date: ${party.date}`, partyX, dateY, { width: partyWidth });
    }
  });

  return dateY + 14;
}
