import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Injectable, Logger } from "@nestjs/common";

const CONVERSION_TIMEOUT_MS = 90_000;

const BINARY_CANDIDATES: ReadonlyArray<string> = [
  process.env.LIBREOFFICE_PATH ?? "",
  "/usr/bin/soffice",
  "/usr/bin/libreoffice",
  "/opt/libreoffice/program/soffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
].filter((candidate) => candidate.length > 0);

/**
 * Converts office documents (legacy .doc, .rtf, .odt, image-only .docx, …) to PDF
 * by shelling out to a headless LibreOffice (`soffice`). The PDF can then go
 * through the normal text-layer extraction and, failing that, Gemini vision OCR.
 *
 * Resolves to `null` whenever LibreOffice is unavailable or the conversion fails —
 * callers fall back to native parsing so a dev box without `soffice` still works.
 */
@Injectable()
export class LibreOfficeConversionService {
  private readonly logger = new Logger(LibreOfficeConversionService.name);
  private resolvedBinary: string | null = null;
  private binaryResolved = false;

  private binaryPath(): string {
    if (!this.binaryResolved) {
      this.binaryResolved = true;
      const onDisk = BINARY_CANDIDATES.find((candidate) => existsSync(candidate));
      this.resolvedBinary = onDisk ?? process.env.LIBREOFFICE_PATH ?? "soffice";
    }
    return this.resolvedBinary ?? "soffice";
  }

  async convertToPdf(input: Buffer, sourceExtension: string): Promise<Buffer | null> {
    const extension = sourceExtension.startsWith(".") ? sourceExtension : `.${sourceExtension}`;
    const workDir = await mkdtemp(join(tmpdir(), "annix-lo-"));
    const profileDir = join(workDir, `profile-${randomUUID()}`);
    const inputPath = join(workDir, `source${extension}`);
    const outputPath = join(workDir, "source.pdf");

    try {
      await writeFile(inputPath, input);
      const succeeded = await this.runSoffice(inputPath, workDir, profileDir);
      if (!succeeded || !existsSync(outputPath)) {
        return null;
      }
      return await readFile(outputPath);
    } catch (error) {
      this.logger.warn(
        `LibreOffice conversion failed for ${extension}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch((cleanupError) =>
        this.logger.debug(`Failed to clean up LibreOffice temp dir ${workDir}: ${cleanupError}`),
      );
    }
  }

  private runSoffice(inputPath: string, outDir: string, profileDir: string): Promise<boolean> {
    return new Promise((resolve) => {
      const args = [
        "--headless",
        "--norestore",
        "--nologo",
        "--nofirststartwizard",
        `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
        "--convert-to",
        "pdf:writer_pdf_Export",
        "--outdir",
        outDir,
        inputPath,
      ];

      const child = spawn(this.binaryPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        this.logger.warn("LibreOffice conversion timed out and was killed.");
      }, CONVERSION_TIMEOUT_MS);

      child.on("error", (err) => {
        clearTimeout(timer);
        this.logger.warn(`LibreOffice binary not runnable (${this.binaryPath()}): ${err.message}`);
        resolve(false);
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          this.logger.warn(`LibreOffice exited with code ${code}: ${stderr.slice(0, 500)}`);
        }
        resolve(code === 0);
      });
    });
  }
}
