import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { pdfToPng } from "pdf-to-png-converter";

type PdfToPngOptions = Parameters<typeof pdfToPng>[1];

// nest build (tsc) emits this worker to dist alongside this file, so __dirname
// resolves it in both dev (runs from dist) and prod (node dist/main).
const WORKER_PATH = join(__dirname, "pdf-to-png.worker.js");

export interface PdfPngPage {
  pageNumber: number;
  name: string;
  path: string;
  width: number;
  height: number;
  content: Buffer;
}

interface SerialisedPdfPngPage extends Omit<PdfPngPage, "content"> {
  content: ArrayBufferLike;
}

interface PdfToPngWorkerMessage {
  ok: boolean;
  pages?: SerialisedPdfPngPage[];
  error?: string;
}

/**
 * Drop-in replacement for `pdfToPng(...)` that runs the CPU-bound pdf.js
 * rasterisation in a worker thread instead of on the main event loop. Same
 * inputs and (structurally) the same output, so call sites change only the
 * function name. This is the fix for prod going unresponsive while multi-page
 * PDFs are converted for OCR — the event loop was blocked for tens of seconds.
 */
export function pdfToPngOffThread(
  pdf: ArrayBufferLike,
  options: PdfToPngOptions,
): Promise<PdfPngPage[]> {
  return new Promise<PdfPngPage[]>((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, { workerData: { pdf, options } });
    let settled = false;
    const settle = (action: () => void): void => {
      if (settled) return;
      settled = true;
      void worker.terminate();
      action();
    };
    worker.once("message", (message: PdfToPngWorkerMessage) => {
      if (message.ok && message.pages) {
        const pages = message.pages.map((page) => ({
          ...page,
          content: Buffer.from(page.content as ArrayBuffer),
        }));
        settle(() => resolve(pages));
      } else {
        settle(() => reject(new Error(message.error ?? "PDF rasterisation failed in the worker")));
      }
    });
    worker.once("error", (error) => settle(() => reject(error)));
    worker.once("exit", (code) => {
      if (code !== 0) {
        settle(() => reject(new Error(`PDF rasterisation worker exited with code ${code}`)));
      }
    });
  });
}
