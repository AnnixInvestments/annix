import { Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

const logger = new Logger("VisionInputGuard");

export type VisionMediaType = "image/png" | "image/jpeg" | "image/webp";

export interface VisionInputLimits {
  maxPages: number;
  maxImageDimension: number;
  maxBytes: number;
}

/**
 * Thrown when a payload is still over the hard byte ceiling after page-capping
 * and downscaling (or could not be reduced at all) — i.e. a genuine cost-DoS
 * input. Callers surface this as a friendly "document too large" error rather
 * than letting an unbounded payload reach the vision model.
 */
export class VisionInputTooLargeError extends Error {
  constructor(actualBytes: number, maxBytes: number) {
    super(
      `Document is too large to analyse (${Math.round(actualBytes / 1024 / 1024)}MB after reduction; limit ${Math.round(maxBytes / 1024 / 1024)}MB). Please split it and try again.`,
    );
    this.name = "VisionInputTooLargeError";
  }
}

export async function capPdfPages(buffer: Buffer, maxPages: number): Promise<Buffer> {
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = source.getPageCount();
  if (totalPages <= maxPages) {
    return buffer;
  }
  const capped = await PDFDocument.create();
  const indices = Array.from({ length: maxPages }, (_, index) => index);
  const copied = await capped.copyPages(source, indices);
  copied.forEach((page) => capped.addPage(page));
  const cappedBytes = await capped.save();
  logger.warn(
    `Capping vision PDF to the first ${maxPages} of ${totalPages} pages to limit AI input cost.`,
  );
  return Buffer.from(cappedBytes);
}

const MAX_VISION_DECODE_PIXELS = 50_000_000;

async function downscaleImage(
  buffer: Buffer,
  mediaType: VisionMediaType,
  maxDimension: number,
): Promise<Buffer> {
  const image = sharp(buffer, { limitInputPixels: MAX_VISION_DECODE_PIXELS });
  const metadata = await image.metadata();
  const longestEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  if (longestEdge <= maxDimension) {
    return buffer;
  }
  const resized = image.resize(maxDimension, maxDimension, {
    fit: "inside",
    withoutEnlargement: true,
  });
  const encoded =
    mediaType === "image/png"
      ? await resized.png({ compressionLevel: 9 }).toBuffer()
      : mediaType === "image/webp"
        ? await resized.webp({ quality: 85 }).toBuffer()
        : await resized.jpeg({ quality: 85, progressive: true }).toBuffer();
  logger.warn(
    `Downscaling vision image from ${longestEdge}px to ${maxDimension}px to limit AI input cost.`,
  );
  return encoded;
}

async function reduceBuffer(
  buffer: Buffer,
  mediaType: string,
  limits: VisionInputLimits,
): Promise<Buffer> {
  if (mediaType === "application/pdf") {
    return capPdfPages(buffer, limits.maxPages);
  }
  if (mediaType === "image/png" || mediaType === "image/jpeg" || mediaType === "image/webp") {
    return downscaleImage(buffer, mediaType, limits.maxImageDimension);
  }
  return buffer;
}

/**
 * Bounds the size of content sent to a vision model (#401 ai-security): caps a
 * PDF's page count, downscales oversized images, and enforces a hard byte
 * ceiling so a hostile or accidental upload (huge page count, pixel/byte bomb,
 * or a file crafted to throw the reducer) cannot run up unbounded AI cost.
 *
 * If reduction throws (a PDF/image the reducer can't parse but the model might),
 * the original is only allowed through when it is already under the byte ceiling;
 * otherwise — and whenever the reduced payload is still over the ceiling — it
 * throws {@link VisionInputTooLargeError} rather than failing open.
 */
export async function reduceVisionInput(
  buffer: Buffer,
  mediaType: string,
  limits: VisionInputLimits,
): Promise<Buffer> {
  const reduced = await reduceBuffer(buffer, mediaType, limits).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Could not reduce vision input, falling back to byte-ceiling check: ${message}`);
    return buffer;
  });
  if (reduced.byteLength > limits.maxBytes) {
    throw new VisionInputTooLargeError(reduced.byteLength, limits.maxBytes);
  }
  return reduced;
}

const DEFAULT_MAX_VISION_PAGES = 100;
const DEFAULT_MAX_VISION_IMAGE_DIMENSION = 2200;
const DEFAULT_MAX_VISION_BYTES = 18 * 1024 * 1024;

function positiveIntFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : fallback;
}

/**
 * A generous hard ceiling applied at the shared AI funnel — high enough not to
 * truncate normal business documents (drawing sets, multi-page CoAs), low enough
 * to stop a runaway PDF or a pixel/byte bomb from blowing up the vision bill.
 * Per-feature callers (e.g. CV OCR) pass their own tighter limits.
 */
export function defaultVisionInputLimits(): VisionInputLimits {
  return {
    maxPages: positiveIntFromEnv("AI_VISION_MAX_PAGES", DEFAULT_MAX_VISION_PAGES),
    maxImageDimension: positiveIntFromEnv(
      "AI_VISION_MAX_IMAGE_DIM",
      DEFAULT_MAX_VISION_IMAGE_DIMENSION,
    ),
    maxBytes: positiveIntFromEnv("AI_VISION_MAX_BYTES", DEFAULT_MAX_VISION_BYTES),
  };
}
