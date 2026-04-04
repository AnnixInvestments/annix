import PDFDocument from "pdfkit";

export interface PdfDocumentOptions {
  size?: string;
  layout?: "portrait" | "landscape";
  margin?: number;
  bufferPages?: boolean;
  autoFirstPage?: boolean;
}

export interface PdfRenderResult {
  doc: InstanceType<typeof PDFDocument>;
  toBuffer: () => Promise<Buffer>;
}

export function createPdfDocument(options: PdfDocumentOptions = {}): PdfRenderResult {
  const doc = new PDFDocument({
    size: options.size || "A4",
    layout: options.layout || "portrait",
    margin: options.margin ?? 50,
    bufferPages: options.bufferPages ?? true,
    autoFirstPage: options.autoFirstPage ?? true,
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const toBuffer = () =>
    new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    });

  return { doc, toBuffer };
}

export const PDF_FONTS = {
  REGULAR: "Helvetica",
  BOLD: "Helvetica-Bold",
  ITALIC: "Helvetica-Oblique",
};

export interface PageLayout {
  margin: number;
  contentWidth: number;
  headerHeight: number;
  pageHeight: number;
  pageWidth: number;
}

export const A4_PORTRAIT: PageLayout = {
  margin: 40,
  contentWidth: 595.28 - 80,
  headerHeight: 70,
  pageHeight: 841.89,
  pageWidth: 595.28,
};

export const A4_LANDSCAPE: PageLayout = {
  margin: 30,
  contentWidth: 841.89 - 60,
  headerHeight: 70,
  pageHeight: 595.28,
  pageWidth: 841.89,
};
