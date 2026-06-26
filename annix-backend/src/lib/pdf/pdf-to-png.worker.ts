import { parentPort, workerData } from "node:worker_threads";
import { pdfToPng } from "pdf-to-png-converter";

type PdfToPngOptions = Parameters<typeof pdfToPng>[1];

interface PdfToPngWorkerInput {
  pdf: ArrayBufferLike;
  options: PdfToPngOptions;
}

// Runs the CPU-bound pdf.js rasterisation here, OFF the main event loop, so the
// API/health checks stay responsive while a multi-page PDF is converted for OCR.
async function run(): Promise<void> {
  const input = workerData as PdfToPngWorkerInput;
  const pages = await pdfToPng(input.pdf, input.options);
  const serialised = pages
    .filter((page) => page.content !== undefined)
    .map((page) => {
      const content = page.content as Buffer;
      return {
        pageNumber: page.pageNumber,
        name: page.name,
        path: page.path,
        width: page.width,
        height: page.height,
        content: content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
      };
    });
  parentPort?.postMessage({ ok: true, pages: serialised });
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  parentPort?.postMessage({ ok: false, error: message });
});
