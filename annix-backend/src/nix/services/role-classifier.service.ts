import { Injectable, Logger } from "@nestjs/common";
import { AiChatService } from "../ai-providers/ai-chat.service";
import { hardenedExtractionSystemInstruction } from "../ai-providers/untrusted-content";
import { DocumentRole } from "../entities/nix-extraction.entity";

export type RoleClassificationSource = "filename" | "ai" | "fallback";

export interface RoleClassification {
  role: DocumentRole;
  confidence: number;
  source: RoleClassificationSource;
  reason: string;
}

const DRAWING_EXTENSIONS = new Set(["dwg", "dxf"]);
const SPREADSHEET_EXTENSIONS = new Set(["xls", "xlsx", "xlsm", "csv"]);

const DRAWING_KEYWORDS =
  /\b(drawing|drawings|drw|dwg|sheet|sheets|iso|isometric|isometrics|ga|general\s*arrangement|detail|details|layout|boq|bill\s*of\s*quantities|spool|spools|workshop|fabrication\s*dr)\b/i;

const SPECIFICATION_KEYWORDS =
  /\b(spec|specs|specification|specifications|datasheet|data\s*sheet|painting|coating|lining|rubber\s*lining|weld(ing)?\s*procedure|wps|itp|qcp|sow|scope\s*of\s*work|standard|sans|sabs|astm|nace|procedure|requirement|requirements|technical\s*spec)\b/i;

const filenameStem = (filename: string): string =>
  filename.replace(/\.[^.]+$/, "").replace(/[_\-.]+/g, " ");

const extensionOf = (filename: string): string => {
  const match = filename.match(/\.([^.]+)$/);
  const rawExt = match?.[1];
  return (rawExt || "").toLowerCase();
};

// Cheap-first classification from the filename alone (issue #266
// Phase 1). Returns null when the name carries no usable signal —
// the caller then decides between an AI content glance and the
// low-confidence "other" fallback the user can override in the UI.
export function classifyRoleByFilename(filename: string): RoleClassification | null {
  const ext = extensionOf(filename);
  const stem = filenameStem(filename);

  if (DRAWING_EXTENSIONS.has(ext)) {
    return {
      role: DocumentRole.DRAWING,
      confidence: 0.95,
      source: "filename",
      reason: `.${ext} is a CAD drawing format`,
    };
  }
  if (SPREADSHEET_EXTENSIONS.has(ext)) {
    return {
      role: DocumentRole.DRAWING,
      confidence: 0.8,
      source: "filename",
      reason: "spreadsheets carry BOQ / schedule data, which extracts in the drawing pass",
    };
  }

  const drawingHit = DRAWING_KEYWORDS.test(stem);
  const specHit = SPECIFICATION_KEYWORDS.test(stem);
  if (drawingHit && !specHit) {
    return {
      role: DocumentRole.DRAWING,
      confidence: 0.85,
      source: "filename",
      reason: "filename names a drawing artefact",
    };
  }
  if (specHit && !drawingHit) {
    return {
      role: DocumentRole.SPECIFICATION,
      confidence: 0.85,
      source: "filename",
      reason: "filename names a specification artefact",
    };
  }
  return null;
}

const AI_GLANCE_MAX_BYTES = 8 * 1024 * 1024;

const AI_GLANCE_PROMPT = `Classify this document for an industrial fabrication quoting workflow. Respond with EXACTLY one word — one of:
drawing (engineering drawings, workshop sheets, isometrics, GA drawings, bills of quantities, cutting lists)
specification (painting / coating / lining specs, welding procedures, ITP/QCP, datasheets, technical standards, scope-of-work requirement clauses)
other (correspondence, cover letters, narratives, anything else)`;

@Injectable()
export class RoleClassifierService {
  private readonly logger = new Logger(RoleClassifierService.name);

  constructor(private readonly aiChatService: AiChatService) {}

  classifyByFilename(filename: string): RoleClassification {
    const heuristic = classifyRoleByFilename(filename);
    if (heuristic) return heuristic;
    return {
      role: DocumentRole.OTHER,
      confidence: 0.3,
      source: "fallback",
      reason: "filename carries no role signal — content glance or manual override recommended",
    };
  }

  // Full classification: filename heuristics first; an ambiguous PDF
  // gets a one-shot Gemini glance. Non-PDFs (and oversized files)
  // fall back to the low-confidence guess for manual override.
  async classify(file: {
    originalname: string;
    buffer: Buffer;
    mimetype: string;
  }): Promise<RoleClassification> {
    const heuristic = classifyRoleByFilename(file.originalname);
    if (heuristic) return heuristic;

    const isPdf = file.mimetype === "application/pdf";
    if (!isPdf || file.buffer.length > AI_GLANCE_MAX_BYTES) {
      return this.classifyByFilename(file.originalname);
    }

    try {
      const response = await this.aiChatService.chatWithImage(
        file.buffer.toString("base64"),
        "application/pdf",
        AI_GLANCE_PROMPT,
        hardenedExtractionSystemInstruction(""),
      );
      const answer = (response.content || "").trim().toLowerCase();
      const role = answer.includes("drawing")
        ? DocumentRole.DRAWING
        : answer.includes("spec")
          ? DocumentRole.SPECIFICATION
          : DocumentRole.OTHER;
      return {
        role,
        confidence: 0.7,
        source: "ai",
        reason: `AI content glance (${response.providerUsed})`,
      };
    } catch (error) {
      this.logger.warn(
        `AI role glance failed for ${file.originalname}: ${error instanceof Error ? error.message : error}`,
      );
      return this.classifyByFilename(file.originalname);
    }
  }
}
