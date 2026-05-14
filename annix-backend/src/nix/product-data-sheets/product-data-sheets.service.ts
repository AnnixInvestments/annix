import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { AiChatService } from "../ai-providers/ai-chat.service";
import { ProductDataSheet, ProductDataSheetKind } from "../entities/product-data-sheet.entity";

export interface ProductDataSheetExtraction {
  manufacturer: string | null;
  productName: string | null;
  publishedRevision: string | null;
  publishedDate: string | null;
  brand: string | null;
  description: string | null;
}

/** Forensic envelope so the controller can surface *why* Gemini failed
 *  without forcing the operator to read backend logs. Populated by
 *  extractWithGemini on every call. */
export interface ProductDataSheetExtractionDiagnostic {
  mediaType: string | null;
  bufferBytes: number;
  providerUsed: string | null;
  rawSnippet: string | null;
  errorMessage: string | null;
}

export type UploadOutcome = "new" | "reused" | "superseded";

export interface UploadResult {
  row: ProductDataSheet;
  outcome: UploadOutcome;
  supersededFromRevision: string | null;
  extracted: ProductDataSheetExtraction;
}

/**
 * Org-wide library of product data sheets, shared across every customer app
 * that quotes coating or lining work. Mirrors NixExtraction's revision-
 * tracking pattern: the printed revision on the sheet itself is authoritative,
 * a higher revision supersedes the current latest, the same revision is a
 * no-op.
 */
@Injectable()
export class ProductDataSheetsService {
  private readonly logger = new Logger(ProductDataSheetsService.name);

  constructor(
    @InjectRepository(ProductDataSheet)
    private readonly repo: Repository<ProductDataSheet>,
    private readonly aiChatService: AiChatService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  /**
   * Reads the data sheet with Gemini and registers (or reuses) a library row.
   * Returns the row plus an `outcome` flag so the caller can render the right
   * confirmation in the editor.
   *
   * Decision rules:
   *  - No record for (manufacturerSlug, productSlug) → upload + insert v1.
   *  - Existing latest with same publishedRevision → reuse (no upload, no row).
   *  - Existing latest with different publishedRevision → upload + insert vN+1,
   *    flip old row's is_latest = false and point superseded_by at the new id.
   *  - Existing latest with no publishedRevision AND incoming also has none →
   *    reuse (conservative — don't churn versions when the sheet itself
   *    doesn't carry revision metadata).
   *  - Existing latest with no publishedRevision but incoming has one →
   *    treat as supersede (incoming is more specific).
   */
  async uploadFromBuffer(params: {
    fileBuffer: Buffer;
    originalFilename: string;
    mimeType: string;
    kind: ProductDataSheetKind;
    userId?: number;
  }): Promise<UploadResult> {
    const { fileBuffer, originalFilename, mimeType, kind, userId } = params;

    const { extracted, diagnostic } = await this.extractWithGemini(fileBuffer, mimeType, kind);

    if (!extracted.manufacturer || !extracted.productName) {
      this.logger.warn(
        `Couldn't determine manufacturer/product for ${originalFilename} (kind=${kind}) — Gemini returned manufacturer=${extracted.manufacturer}, productName=${extracted.productName}. Not registering to library.`,
      );
      throw new ExtractionFailedError(extracted, diagnostic);
    }

    const manufacturerSlug = slugify(extracted.manufacturer);
    const productSlug = slugify(extracted.productName);

    const existing = await this.repo.findOne({
      where: {
        manufacturerSlug,
        productSlug,
        isLatest: true,
      },
    });

    const incomingRev = normaliseRevision(extracted.publishedRevision);
    const existingRev = existing ? normaliseRevision(existing.publishedRevision ?? null) : null;

    if (existing && revisionsMatch(incomingRev, existingRev)) {
      return {
        row: existing,
        outcome: "reused",
        supersededFromRevision: null,
        extracted,
      };
    }

    const nextVersion = existing ? existing.version + 1 : 1;
    const subPath = `${StorageArea.PLATFORM}/product-data-sheets/${manufacturerSlug}/${productSlug}/v${nextVersion}`;
    const storage = await this.storageService.upload(
      buildSyntheticMulterFile(fileBuffer, originalFilename, mimeType),
      subPath,
    );

    const row = this.repo.create({
      manufacturer: extracted.manufacturer.trim(),
      manufacturerSlug,
      productName: extracted.productName.trim(),
      productSlug,
      kind,
      version: nextVersion,
      publishedRevision: extracted.publishedRevision ?? undefined,
      publishedDate: normalisePublishedDate(extracted.publishedDate) ?? undefined,
      storagePath: storage.path,
      originalFilename: storage.originalFilename,
      sizeBytes: storage.size,
      mimeType: storage.mimeType,
      extractedBrand: extracted.brand ?? undefined,
      extractedDescription: extracted.description ?? undefined,
      uploadedByUserId: userId,
      isLatest: true,
    });

    const saved = await this.repo.save(row);

    if (existing) {
      existing.isLatest = false;
      existing.supersededById = saved.id;
      existing.supersededAt = new Date();
      await this.repo.save(existing);
    }

    return {
      row: saved,
      outcome: existing ? "superseded" : "new",
      supersededFromRevision: existing ? (existing.publishedRevision ?? null) : null,
      extracted,
    };
  }

  /**
   * Returns a short-lived presigned URL for viewing a data sheet — used by
   * the (future) library browse page and the QuoteSpecsEditor 'View on file'
   * affordance once a row has matched.
   */
  async presignedUrl(id: number, expiresIn = 600): Promise<string | null> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) return null;
    return this.storageService.presignedUrl(row.storagePath, expiresIn);
  }

  async findById(id: number): Promise<ProductDataSheet | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Full version history for a (manufacturer, product) pair, latest first
   * then descending by version. Powers the future archive view.
   */
  async listVersions(manufacturerSlug: string, productSlug: string): Promise<ProductDataSheet[]> {
    return this.repo.find({
      where: { manufacturerSlug, productSlug },
      order: { isLatest: "DESC", version: "DESC" },
    });
  }

  // ------------------------------------------------------------------
  // Gemini extraction
  // ------------------------------------------------------------------

  private async extractWithGemini(
    fileBuffer: Buffer,
    mimeType: string,
    kind: ProductDataSheetKind,
  ): Promise<{
    extracted: ProductDataSheetExtraction;
    diagnostic: ProductDataSheetExtractionDiagnostic;
  }> {
    const mediaType = normaliseDataSheetMediaType(mimeType);
    if (!mediaType) {
      this.logger.warn(`Unsupported data sheet media type: ${mimeType}`);
      return {
        extracted: emptyExtraction(),
        diagnostic: {
          mediaType: null,
          bufferBytes: fileBuffer.length,
          providerUsed: null,
          rawSnippet: null,
          errorMessage: `Unsupported media type: ${mimeType}`,
        },
      };
    }

    const base64 = fileBuffer.toString("base64");

    const systemPrompt = `You read product data sheets and emit a single JSON object — no prose, no markdown — with this exact shape:
{
  "manufacturer": string|null,
  "productName": string|null,
  "publishedRevision": string|null,
  "publishedDate": string|null,
  "brand": string|null,
  "description": string|null
}
Use null when a field is genuinely absent from the document. Never invent values.`;

    const userPrompt =
      kind === ProductDataSheetKind.COATING ? this.coatingPrompt() : this.liningPrompt();

    this.logger.log(
      `extractWithGemini start: mediaType=${mediaType}, bufferBytes=${fileBuffer.length}, kind=${kind}`,
    );
    try {
      const result = await this.aiChatService.chatWithImage(
        base64,
        mediaType,
        userPrompt,
        systemPrompt,
        { temperature: 0.1, maxOutputTokens: 2048, responseFormat: "json" },
      );
      this.logger.log(
        `extractWithGemini Gemini returned: providerUsed=${result.providerUsed}, tokens=${result.tokensUsed ?? "?"}, content.length=${result.content.length}`,
      );
      this.logger.log(`extractWithGemini raw content: ${result.content.slice(0, 800)}`);
      const parsed = this.parseExtractionResponse(result.content);
      this.logger.log(
        `extractWithGemini parsed: manufacturer=${parsed.manufacturer}, productName=${parsed.productName}, rev=${parsed.publishedRevision}`,
      );
      return {
        extracted: parsed,
        diagnostic: {
          mediaType,
          bufferBytes: fileBuffer.length,
          providerUsed: result.providerUsed ?? null,
          rawSnippet: result.content.slice(0, 600),
          errorMessage: this.lastParseError,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Gemini extraction THREW: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        extracted: emptyExtraction(),
        diagnostic: {
          mediaType,
          bufferBytes: fileBuffer.length,
          providerUsed: null,
          rawSnippet: null,
          errorMessage,
        },
      };
    }
  }

  private coatingPrompt(): string {
    return [
      "Read this paint / coating product data sheet and return JSON with these fields:",
      "",
      "- `manufacturer`: the company that makes the product (e.g. 'Stoncor', 'Carboline', 'Corrocoat', 'Hempel', 'Jotun', 'Sigma', 'International Paint', 'Sherwin-Williams'). Just the company name — no taglines or addresses.",
      "- `productName`: the single product this sheet describes (e.g. 'Plasite 4550-S', 'Carboguard 890 Aluminium', 'Carbothane 137 HS'). For multi-coat system sheets, use the primary / first product named.",
      "- `publishedRevision`: the document's own revision identifier — usually in the footer or small-print header, e.g. 'Rev 03', 'Issue 2.1', 'Version A4', 'Edition 12/2024'. Quote it verbatim. Null if the sheet doesn't print one.",
      "- `publishedDate`: the publication or issue date the sheet prints (ISO-8601 yyyy-mm-dd preferred, or yyyy-mm if no day is given). Null if not stated.",
      "- `brand`: the same value as `manufacturer` — used to populate the supplier-row brand field in our quote editor.",
      "- `description`: the line a quoter would write next to the brand. Format: '<Product name> @ <DFT range>μm'. Use ranges like '100-150μm' when given, else the single recommended DFT. Append ', colour: <name>' or ', RAL <number>' only if the sheet specifies a colour for this coat. For multi-coat systems, list each coat separated by ', '. Skip product codes, certification numbers, marketing copy.",
      "",
      "Examples:",
      "  Linatex / Linard 60: { manufacturer: 'Linatex', ... } — NO, that's a lining, not a coating.",
      "  Stoncor / Plasite 4550-S: { manufacturer: 'Stoncor', productName: 'Plasite 4550-S', publishedRevision: 'Rev 04', publishedDate: '2025-03', brand: 'Stoncor', description: 'Plasite 4550-S @ 600-800μm' }",
      "  Carboline / Carboguard 890: { manufacturer: 'Carboline', productName: 'Carboguard 890 Aluminium', publishedRevision: 'Issue 12', publishedDate: '2024-11-01', brand: 'Carboline', description: 'Carboguard 890 Aluminium @ 100-150μm' }",
      "",
      "If the document is genuinely not a paint / coating product data sheet, return every field as null.",
    ].join("\n");
  }

  private liningPrompt(): string {
    return [
      "Read this rubber / polymer / elastomer lining or sheeting product data sheet and return JSON with these fields:",
      "",
      "- `manufacturer`: the company that makes the product. Brand-name only — NOT the legal entity suffix. e.g. 'Linatex' (not 'Linatex Ltd'), 'Trelleborg', 'Weir', 'Polycorp', 'AU Industries' (when 'AU INDUSTRIES PTY LTD' appears, write 'AU Industries' in normal case).",
      "- `productName`: the marketing name of the product — short and recognisable, what the quoter would write on a quote. Include the series/grade descriptor and the colour if they're part of the printed product name. e.g. 'Linard 60', 'Linatex Premium', 'Premium 60 Shore Red' (when the sheet titles the product as 'AU Premium 60 Shore Red Steam Cured', the marketing name is 'Premium 60 Shore Red' — 'Steam Cured' is a cure-method property, not part of the name). Use Title Case. Don't repeat the manufacturer in productName.",
      "- `publishedRevision`: the document's own revision identifier — usually printed in small text in the footer or header, e.g. 'Rev 03', 'Issue 2.1', 'Version A4', 'Edition 12/2024', 'TDS-001 Rev B'. Quote it verbatim. Null if the sheet doesn't print one.",
      "- `publishedDate`: the publication or issue date the sheet prints (yyyy-mm-dd or yyyy-mm). Null if not stated.",
      "- `brand`: leave null. Linings are quoted as a single product without a separate brand column.",
      "- `description`: a comma-separated list of ONLY the material properties printed on the sheet, in this order, dropping any that the sheet doesn't state: hardness ('60 Shore A'), cure method ('steam cured', 'autoclave vulcanised', 'press cured'), bonding compatibility ('hot-bonded', 'cold-bonded'), polymer family ('natural rubber', 'NBR', 'EPDM', 'butyl'), colour ('red', 'black', 'tan'). Skip specific gravity / tensile / abrasion class — those belong in long-form specs, not the quote line. Do NOT prepend manufacturer + productName here; the editor composes the final quote line as '<manufacturer> <productName>, <thicknesses from drawings>, <description>'.",
      "",
      "Examples:",
      "  Linatex / Linard 60 sheet: { manufacturer: 'Linatex', productName: 'Linard 60', publishedRevision: 'Rev 03', publishedDate: '2024-08', brand: null, description: '60 Shore A, steam cured, hot-bonded, natural rubber, red' }",
      "  AU INDUSTRIES Premium 60 Shore Red Steam Cured sheet: { manufacturer: 'AU Industries', productName: 'Premium 60 Shore Red', publishedRevision: 'Rev 0', publishedDate: '2024-12', brand: null, description: '60 Shore A, steam cured, hot-bonded, natural rubber, red' }",
      "  Trelleborg / Skega 60: { manufacturer: 'Trelleborg', productName: 'Skega 60', publishedRevision: 'Issue 2', publishedDate: '2023-06-15', brand: null, description: '60 Shore A, autoclave vulcanised, silica-reinforced natural rubber, red' }",
      "",
      "Important: bore thickness and flange thickness are application-specific (decided by the quoter from drawings) — do NOT extract them from the data sheet and do NOT include them in the description.",
      "",
      "If the document is genuinely not a rubber / polymer lining data sheet, return every field as null.",
    ].join("\n");
  }

  /** Last parser failure reason, exposed to the controller through the
   *  diagnostic so a malformed reply can be shown in the upload error
   *  banner without forcing the operator to read terminal logs. Cleared
   *  on every successful parse. */
  private lastParseError: string | null = null;

  private parseExtractionResponse(raw: string): ProductDataSheetExtraction {
    this.lastParseError = null;
    // Gemini sometimes wraps its JSON in ```json … ``` fences, sometimes
    // appends a prose footer like "Note: based on the document above…",
    // and very occasionally returns the JSON inside a larger object. The
    // safest extraction is to grab the first balanced { … } block and
    // parse that — everything else is noise.
    const candidate = extractFirstJsonObject(raw);
    if (!candidate) {
      this.lastParseError = `no JSON object found in reply (length=${raw.length})`;
      this.logger.warn(`${this.lastParseError} — raw=${raw.slice(0, 200)}`);
      return emptyExtraction();
    }
    try {
      const parsed = JSON.parse(candidate);
      return {
        manufacturer: stringOrNull(parsed.manufacturer),
        productName: stringOrNull(parsed.productName),
        publishedRevision: stringOrNull(parsed.publishedRevision),
        publishedDate: stringOrNull(parsed.publishedDate),
        brand: stringOrNull(parsed.brand),
        description: stringOrNull(parsed.description),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      this.lastParseError = `JSON.parse threw: ${message}`;
      this.logger.warn(`${this.lastParseError} — candidate=${candidate.slice(0, 200)}`);
      return emptyExtraction();
    }
  }
}

export class ExtractionFailedError extends Error {
  constructor(
    public readonly extracted: ProductDataSheetExtraction,
    public readonly diagnostic: ProductDataSheetExtractionDiagnostic,
  ) {
    super("Could not determine manufacturer + product from data sheet");
    this.name = "ExtractionFailedError";
  }
}

function emptyExtraction(): ProductDataSheetExtraction {
  return {
    manufacturer: null,
    productName: null,
    publishedRevision: null,
    publishedDate: null,
    brand: null,
    description: null,
  };
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== "null" ? trimmed : null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normaliseRevision(revision: string | null): string | null {
  if (!revision) return null;
  return revision.trim().toLowerCase().replace(/\s+/g, " ");
}

function revisionsMatch(incoming: string | null, existing: string | null): boolean {
  if (incoming === null && existing === null) return true;
  if (incoming === null || existing === null) return false;
  return incoming === existing;
}

/**
 * Returns the first balanced `{ … }` block in `raw`. Handles code-fenced
 * replies, prose preambles ("Here is the JSON: …"), and prose footers
 * ("Note: this is approximate") that would otherwise break JSON.parse.
 * Skips over braces that live inside string literals (escapes included)
 * so a `{` in a "description" value doesn't get mistaken for an opener.
 * Returns null if no balanced object is found.
 */
function extractFirstJsonObject(raw: string): string | null {
  const text = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "");
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Coerce Gemini's `publishedDate` (which the prompt allows as either
 * `yyyy-mm-dd` or `yyyy-mm`) into a value Postgres' `date` column will
 * accept. Month-only inputs are anchored to the first of the month —
 * data sheets that print only "10/2015" almost never list a day, and
 * the first-of-month convention is what the rest of the codebase uses.
 * Anything that doesn't match either pattern is dropped (`null`) so a
 * malformed extraction can't break the insert.
 */
function normalisePublishedDate(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  return null;
}

function normaliseDataSheetMediaType(
  mimeType: string,
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" | null {
  const lower = mimeType.toLowerCase();
  if (lower === "application/pdf") return "application/pdf";
  if (lower === "image/jpeg" || lower === "image/jpg") return "image/jpeg";
  if (lower === "image/png") return "image/png";
  if (lower === "image/gif") return "image/gif";
  if (lower === "image/webp") return "image/webp";
  return null;
}

function buildSyntheticMulterFile(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
): Express.Multer.File {
  return {
    fieldname: "file",
    originalname,
    encoding: "7bit",
    mimetype,
    size: buffer.length,
    buffer,
    stream: null as never,
    destination: "",
    filename: "",
    path: "",
  };
}
