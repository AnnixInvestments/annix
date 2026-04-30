import { Injectable, Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";

@Injectable()
export class PdfSlicerService {
  private readonly logger = new Logger(PdfSlicerService.name);

  async slicePages(sourceBuffer: Buffer, pageNumbers: number[]): Promise<Buffer> {
    const sourcePdf = await PDFDocument.load(sourceBuffer);
    const totalPages = sourcePdf.getPageCount();
    const validIndices = pageNumbers
      .map((p) => Math.round(p))
      .filter((p) => p >= 1 && p <= totalPages)
      .map((p) => p - 1);
    const uniqueIndices = Array.from(new Set(validIndices)).sort((a, b) => a - b);
    if (uniqueIndices.length === 0) {
      throw new Error(
        `No valid page numbers to slice (requested ${pageNumbers.join(",")}, total ${totalPages})`,
      );
    }
    const sliced = await PDFDocument.create();
    const copied = await sliced.copyPages(sourcePdf, uniqueIndices);
    copied.forEach((page) => sliced.addPage(page));
    const slicedBytes = await sliced.save();
    return Buffer.from(slicedBytes);
  }
}
