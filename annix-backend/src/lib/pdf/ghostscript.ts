import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MILLIS = 60_000;
const MAX_OUTPUT_BUFFER_BYTES = 16 * 1024 * 1024;
const WINDOWS_DEFAULT_BINARY = "C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe";

function ghostscriptBinary(): string {
  const configured = process.env.GHOSTSCRIPT_PATH?.trim();
  if (configured) {
    return configured;
  }
  return process.platform === "win32" ? WINDOWS_DEFAULT_BINARY : "gs";
}

interface RenderPdfToPngOptions {
  inputPath: string;
  outputPath: string;
  dpi: number;
  firstPage?: number;
  lastPage?: number;
  timeoutMillis?: number;
}

/**
 * Rasterises a PDF to PNG via Ghostscript using execFile with an argument array
 * (NO shell) so file paths and page numbers can never be interpreted as shell
 * metacharacters (#401 ai-security). The binary is resolved from
 * GHOSTSCRIPT_PATH, falling back to the platform default.
 */
export async function renderPdfToPng(
  options: RenderPdfToPngOptions,
): Promise<{ stdout: string; stderr: string }> {
  const args = [
    "-dNOPAUSE",
    "-dBATCH",
    "-dSAFER",
    "-sDEVICE=png16m",
    `-r${Math.max(1, Math.round(options.dpi))}`,
    "-dTextAlphaBits=4",
    "-dGraphicsAlphaBits=4",
  ];
  if (options.firstPage != null) {
    args.push(`-dFirstPage=${Math.max(1, Math.trunc(options.firstPage))}`);
  }
  if (options.lastPage != null) {
    args.push(`-dLastPage=${Math.max(1, Math.trunc(options.lastPage))}`);
  }
  args.push(`-sOutputFile=${options.outputPath}`, options.inputPath);

  const { stdout, stderr } = await execFileAsync(ghostscriptBinary(), args, {
    timeout: options.timeoutMillis ?? DEFAULT_TIMEOUT_MILLIS,
    maxBuffer: MAX_OUTPUT_BUFFER_BYTES,
  });
  return { stdout: stdout.toString(), stderr: stderr.toString() };
}
