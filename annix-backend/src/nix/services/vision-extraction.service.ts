import { Injectable, Logger } from "@nestjs/common";
import { AiChatService } from "../ai-providers/ai-chat.service";
import { DEFAULT_EXTRACTION_SYSTEM_PROMPT } from "../ai-providers/ai-provider.interface";
import { hardenedExtractionSystemInstruction } from "../ai-providers/untrusted-content";
import type { ExtractedItem, SpecificationCellData } from "./excel-extractor.service";
import { enforceExplicitDescriptionSpecs } from "./explicit-size-guard";

// Extracted from NixService (#430 Phase 4) — Gemini multimodal (vision) PDF
// extraction plus the defensive JSON-salvage + vision-item normalisation that
// only the vision path uses.
@Injectable()
export class VisionExtractionService {
  private readonly logger = new Logger(VisionExtractionService.name);

  constructor(private readonly aiChatService: AiChatService) {}

  /**
   * Parse a JSON extraction response defensively. With responseFormat: 'json'
   * the model SHOULD return a clean JSON document, but vision responses can
   * still get truncated when an item-rich drawing approaches the output cap.
   * If JSON.parse fails we fall back to truncating at the last comma boundary
   * we can trust and re-trying — a partial result with N items beats throwing
   * the whole extraction away.
   */
  parseExtractionJson(raw: string): Record<string, unknown> | null {
    if (!raw || raw.trim().length === 0) return null;
    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    for (const candidate of this.jsonObjectCandidates(cleaned)) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
      } catch {
        // try the next candidate slice
      }
    }
    return null;
  }

  /**
   * Ordered list of substrings to attempt JSON.parse on, most-likely-correct
   * first. Gemini sometimes wraps the JSON in a prose preamble ("Here is the
   * extracted data:\n{...}") or trailing commentary, or truncates mid-array
   * when it hits the output-token cap — each of which makes a naive
   * JSON.parse of the whole response throw. We recover by (1) the first
   * brace-balanced object, (2) first `{` to last `}`, and (3) a salvaged
   * truncated `"items": [...]` array.
   */
  jsonObjectCandidates(text: string): string[] {
    const candidates: string[] = [text];
    const firstBrace = text.indexOf("{");
    if (firstBrace < 0) return candidates;
    const fromFirstBrace = text.slice(firstBrace);
    const balanced = this.firstBalancedJsonObject(fromFirstBrace);
    if (balanced) candidates.push(balanced);
    const lastBrace = fromFirstBrace.lastIndexOf("}");
    if (lastBrace > 0) {
      candidates.push(fromFirstBrace.slice(0, lastBrace + 1));
      // Truncated after a complete item but before the array/object closed:
      // close the items array and the root object so the items parsed so far
      // are still recovered.
      candidates.push(`${fromFirstBrace.slice(0, lastBrace + 1)}]}`);
    }
    const itemsClose = fromFirstBrace.lastIndexOf("]");
    if (itemsClose > 0) candidates.push(`${fromFirstBrace.slice(0, itemsClose + 1)}}`);
    return candidates;
  }

  /**
   * Returns the first complete, brace-balanced JSON object in the string,
   * tracking string literals and escapes so braces inside quoted values
   * don't throw off the depth count. Returns null when the object never
   * closes (a truncated response), letting the caller fall back to the
   * truncation-salvage candidates.
   */
  firstBalancedJsonObject(text: string): string | null {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        if (inString) escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return text.slice(0, i + 1);
      }
    }
    return null;
  }

  /**
   * Vision-based PDF extraction. Sends the raw PDF to Gemini's multimodal
   * API (chatWithImage with media_type "application/pdf") so it OCRs the
   * rendered pages directly — needed for image-based engineering drawings
   * where pdf-parse returns nothing useful. Returns null if the response
   * can't be parsed as JSON in the expected shape.
   */
  async extractFromPdfWithVision(
    pdfBuffer: Buffer,
    documentName: string,
    profileSystemPrompt?: string,
  ): Promise<{
    items: ExtractedItem[];
    specifications: Record<string, unknown>;
    specificationCells: SpecificationCellData[];
    metadata: Record<string, unknown>;
    providerUsed: string;
    processingTimeMs: number;
  } | null> {
    const start = Date.now();
    const base64 = pdfBuffer.toString("base64");
    const userPrompt = `Document: ${documentName}\n\nExtract every quotable line item AND every cross-cutting specification clause you can see, following the JSON shape in the system prompt. Read the PDF visually — title blocks, dimensioned drawings, BOM tables, handwritten markups all count.`;
    const systemPrompt = hardenedExtractionSystemInstruction(
      profileSystemPrompt ?? DEFAULT_EXTRACTION_SYSTEM_PROMPT,
    );

    try {
      // Cap the outer re-send loop: each chatWithImage already runs its own
      // transient-error retry, and re-sending the whole (large) PDF on a mere
      // JSON-parse miss rarely helps while multiplying vision cost/latency.
      // One re-send covers model non-determinism; beyond that we fail cleanly.
      const maxAttempts = 2;
      let result: Awaited<ReturnType<typeof this.aiChatService.chatWithImage>> | null = null;
      let parsed: Record<string, unknown> | null = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        result = await this.aiChatService.chatWithImage(
          base64,
          "application/pdf",
          userPrompt,
          systemPrompt,
          { temperature: 0.1, maxOutputTokens: 32_768, responseFormat: "json" },
        );
        parsed = this.parseExtractionJson(result.content);
        if (parsed) break;
        this.logger.warn(
          `Vision extraction returned no parseable JSON for ${documentName} on attempt ${attempt}/${maxAttempts}; raw length=${result.content.length}`,
        );
      }
      if (!parsed || !result) {
        this.logger.error(
          `Vision extraction failed to return parseable JSON for ${documentName} after ${maxAttempts} attempts — the drawing could not be read.`,
        );
        return null;
      }
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
      if (rawItems.length > 0) {
        const sample = rawItems[0];
        const sampleKeys = Object.keys(sample as Record<string, unknown>);
        this.logger.log(
          `Vision extraction sample item keys: [${sampleKeys.join(", ")}]; first item: ${JSON.stringify(sample).slice(0, 400)}`,
        );
      }
      const items: ExtractedItem[] = rawItems.map((item: Record<string, unknown>) =>
        this.guardVisionItem(this.normaliseVisionItem(item)),
      );
      // 'specifications' may be an object keyed by clause code (the canonical
      // shape since #253 prompt rewrite) OR an array of cells from older
      // pipeline runs. Handle both so the dict goes to specifications and
      // the array goes to specificationCells.
      const rawSpecs = parsed.specifications;
      const specifications: Record<string, unknown> =
        rawSpecs && typeof rawSpecs === "object" && !Array.isArray(rawSpecs)
          ? (rawSpecs as Record<string, unknown>)
          : {};
      const specificationCells: SpecificationCellData[] = Array.isArray(rawSpecs)
        ? (rawSpecs as SpecificationCellData[])
        : [];
      return {
        items,
        specifications,
        specificationCells,
        metadata: (parsed.metadata as Record<string, unknown>) ?? {},
        providerUsed: result.providerUsed,
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      this.logger.error(
        `Vision extraction threw for ${documentName}: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      );
      return null;
    }
  }

  /**
   * Coerces a Gemini-vision-returned item into our internal ExtractedItem
   * shape. Vision responses are looser than the strictly-structured text
   * extraction path, so we apply lenient mapping with sensible defaults
   * rather than throwing on schema drift.
   */
  // Issue #294: re-assert the row's own description-derived specs after the AI
  // pass so a sub-item cannot inherit a parent's bore/material. The text path
  // does this in ai-extraction.service; the vision path (image-only drawings —
  // exactly where nested sub-items are most likely) previously skipped it.
  guardVisionItem(item: ExtractedItem): ExtractedItem {
    const { item: guarded, corrections } = enforceExplicitDescriptionSpecs(item);
    if (corrections.length > 0) {
      this.logger.warn(
        `Vision explicit-size guard corrected row ${item.rowNumber} ("${item.description.substring(0, 80)}"): ${corrections.join("; ")}`,
      );
    }
    return guarded;
  }

  normaliseVisionItem(item: Record<string, unknown>): ExtractedItem {
    // Gemini occasionally nests dimensions, lining, and other groups despite
    // the system prompt asking for a flat schema. Flatten one level so the
    // multi-key lookup below sees them whether top-level or nested.
    const flat: Record<string, unknown> = { ...item };
    const dims = item.dimensions;
    if (dims && typeof dims === "object" && !Array.isArray(dims)) {
      Object.assign(flat, dims as Record<string, unknown>);
    }
    const lining = item.internal_lining ?? item.internalLining ?? item.lining;
    if (lining && typeof lining === "object" && !Array.isArray(lining)) {
      const liningObj = lining as Record<string, unknown>;
      if (liningObj.material && !flat.liningType) flat.liningType = liningObj.material;
      if (liningObj.thicknessMm && !flat.liningThicknessMm)
        flat.liningThicknessMm = liningObj.thicknessMm;
    }
    const drawingRef = item.drawing_reference ?? item.drawingReference;
    if (drawingRef && typeof drawingRef === "object" && !Array.isArray(drawingRef)) {
      const refObj = drawingRef as Record<string, unknown>;
      const parts = [refObj.number, refObj.mto, refObj.sheet]
        .filter((v) => typeof v === "string" && v.length > 0)
        .join(" ");
      if (parts.length > 0) flat.drawingReference = parts;
    }

    const numFrom = (...keys: string[]): number | null => {
      for (const k of keys) {
        const v = flat[k];
        if (typeof v === "number") return v;
        if (typeof v === "string" && v.trim().length > 0) {
          const parsed = Number.parseFloat(v);
          if (Number.isFinite(parsed)) return parsed;
        }
      }
      return null;
    };
    const strFrom = (...keys: string[]): string | null => {
      for (const k of keys) {
        const v = flat[k];
        if (typeof v === "string" && v.trim().length > 0) return v;
      }
      return null;
    };
    const description = strFrom("description", "desc", "itemDescription") ?? "";
    const liningType = strFrom("liningType", "lining", "internal_lining", "internalLining");
    const coatingSystem = strFrom(
      "coatingSystem",
      "paintSystem",
      "external_paint_system_ref",
      "external_paint_system_reference",
      "externalPaintSystemRef",
      "externalPaintSystem",
      "external_paint_system",
    );
    const materialClass = strFrom(
      "materialClass",
      "material_class_ref",
      "material_class_reference",
      "materialClassRef",
      "material_class",
    );
    const liningThicknessMm = numFrom(
      "liningThicknessMm",
      "liningThickness",
      "lining_thickness_mm",
    );
    const liningFlangeFaceThicknessMm = numFrom(
      "liningFlangeFaceThicknessMm",
      "liningFlangeFaceThickness",
      "lining_flange_face_thickness_mm",
    );
    const internalCoatingDescription = strFrom(
      "internalCoatingDescription",
      "corrosionInternal",
      "corrosion_int",
      "internalPaint",
    );
    const externalCoatingDescription = strFrom(
      "externalCoatingDescription",
      "corrosionExternal",
      "corrosion_ext",
      "externalPaint",
    );
    const bandingDetails = strFrom("bandingDetails", "bands", "bandCallout");
    const flangeClass = strFrom("flangeClass", "flange_class", "flangeClassRating");
    const deviationsRaw = item["deviations"];
    const deviations = Array.isArray(deviationsRaw)
      ? (deviationsRaw.filter((d) => typeof d === "string" && d.length > 0) as string[])
      : null;
    return {
      rowNumber: numFrom("rowNumber") ?? 0,
      itemNumber:
        strFrom(
          "itemNumber",
          "mark",
          "markNumber",
          "mark_number",
          "itemNo",
          "itemMark",
          "spoolNumber",
          "spool_number",
          "no",
        ) ?? null,
      description,
      itemType: (strFrom("itemType", "type") as ExtractedItem["itemType"]) ?? "unknown",
      material: strFrom("material"),
      materialGrade: strFrom("materialGrade", "grade"),
      diameter: numFrom(
        "diameter",
        "nb",
        "NB",
        "NB_mm",
        "nb_mm",
        "nominalBore",
        "nominal_bore_mm",
        "bore",
      ),
      diameterUnit: (strFrom("diameterUnit") as ExtractedItem["diameterUnit"]) ?? "mm",
      secondaryDiameter: numFrom("secondaryDiameter"),
      length: numFrom("length", "lengthMm", "length_mm", "L", "overallLengthMm"),
      wallThickness: numFrom("wallThickness", "wt", "WT", "WT_mm", "wt_mm", "wall_thickness_mm"),
      schedule: strFrom("schedule"),
      angle: numFrom("angle"),
      flangeConfig:
        (strFrom("flangeConfig", "endConfiguration", "end_configuration", "ends") as
          | ExtractedItem["flangeConfig"]
          | undefined) ?? null,
      quantity: numFrom("quantity", "qty", "count") ?? 1,
      unit: strFrom("unit") ?? "ea",
      confidence: numFrom("confidence") ?? 0.7,
      needsClarification: false,
      clarificationReason: null,
      rawData: item as Record<string, unknown>,
      ...(liningType ? { liningType } : {}),
      ...(coatingSystem ? { coatingSystem } : {}),
      ...(materialClass ? { materialClass } : {}),
      ...(liningThicknessMm !== null ? { liningThicknessMm } : {}),
      ...(liningFlangeFaceThicknessMm !== null ? { liningFlangeFaceThicknessMm } : {}),
      ...(internalCoatingDescription ? { internalCoatingDescription } : {}),
      ...(externalCoatingDescription ? { externalCoatingDescription } : {}),
      ...(bandingDetails ? { bandingDetails } : {}),
      ...(flangeClass ? { flangeClass } : {}),
      ...(deviations && deviations.length > 0 ? { deviations } : {}),
    } as ExtractedItem;
  }
}
