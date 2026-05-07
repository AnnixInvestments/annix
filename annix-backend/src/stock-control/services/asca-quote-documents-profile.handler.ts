import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DocumentRole, type NixExtraction } from "../../nix/entities/nix-extraction.entity";
import type {
  ExtractionProfileContext,
  ExtractionProfileResult,
  IExtractionProfileHandler,
} from "../../nix/profiles";
import { NixExtractionProfileRegistry } from "../../nix/profiles";

@Injectable()
export class AscaQuoteDocumentsProfileHandler implements IExtractionProfileHandler, OnModuleInit {
  private readonly logger = new Logger(AscaQuoteDocumentsProfileHandler.name);
  readonly profileKey = "asca-quote-documents";
  readonly label = "ASCA — Quote documents (drawings + specifications)";
  readonly sourceModule = "asca";

  constructor(private readonly registry: NixExtractionProfileRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async postExtract(
    extraction: NixExtraction,
    context: ExtractionProfileContext,
  ): Promise<ExtractionProfileResult> {
    const itemCount = context.extractedItems?.length ?? 0;
    this.logger.log(
      `asca-quote-documents postExtract — extraction #${extraction.id}, role=${
        extraction.documentRole ?? "n/a"
      }, sourceId=${extraction.sourceId ?? "n/a"}, document="${extraction.documentName}", extractedItems=${itemCount}`,
    );
    return {
      metadata: {
        profile: this.profileKey,
        documentRole: extraction.documentRole,
        extractedItemCount: itemCount,
        siblingCount: context.sessionSiblings?.length ?? 0,
      },
    };
  }

  systemPrompt(input?: { role?: DocumentRole; siblings?: NixExtraction[] }): string | undefined {
    const role = input?.role;
    const siblings = input?.siblings ?? [];

    if (role === DocumentRole.DRAWING) {
      return ASCA_DRAWING_PROMPT;
    }
    if (role === DocumentRole.SPECIFICATION) {
      return buildAscaSpecificationPrompt(siblings);
    }
    // Role unknown / other — let Gemini classify the document and extract
    // whatever's there using the broad ASCA brief.
    return ASCA_GENERAL_PROMPT;
  }
}

/**
 * Drawing-role prompt — focused on extracting line items + the spec codes
 * (R1, R2a, SC1, etc.) that the drawing references but doesn't define.
 */
const ASCA_DRAWING_PROMPT = `You are Nix, extracting line items from an ASCA (AU Industries Stock Control) workshop / spool / fabrication drawing. The user will upload spec documents separately, so do NOT try to define the paint or lining systems here — just capture the codes the drawing references and the item-level data.

Items may be any fabricated industrial product: pipes/spools, bends, fittings, flanges, tanks, chutes, hoppers, conveyor pulleys, drums, screens, launders, underpans, plate work, structural assemblies. Identify what the drawing actually shows — do not force everything into a pipes-only shape.

CRITICAL — schema rules (must follow exactly):
1. Each item MUST be a FLAT object — no nested 'dimensions' / 'paint' / 'lining' sub-objects. Every property is at the top level of the item.
2. Use these EXACT field names (camelCase, no aliases, no variants):
   - itemNumber (string, e.g. "-01", "HH01", "P1") — the mark / spool / item number
   - description (string, REQUIRED, what the item is, e.g. "Pipe", "90° Bend", "Reducer", "Tank chute")
   - itemType (one of: pipe | bend | reducer | tee | flange | expansion_joint | tank_chute | other)
   - quantity (number)
   - diameter (number, mm — nominal bore for pipe-shaped items)
   - wallThickness (number, mm)
   - length (number, mm)
   - flangeConfig (string — verbatim drawing wording, e.g. "P.E.", "F.B.E. F/F", "F/PE")
   - liningType (string or null — internal lining material, e.g. "Linatex Linard 60", or null if none)
   - liningThicknessMm (number or null)
   - coatingSystem (string or null — external paint system code, e.g. "R1", "R2a")
   - materialClass (string or null — material class code, e.g. "SC1", "1000/3")
   - banding (number — count of identification bands shown per item)
   - deviations (array of strings — handwritten/red-pen/coloured-pen client deviations from the printed spec; surface SEPARATELY here, do NOT silently merge into the printed values)
   - drawingReference (string)
   - revision (string)
3. EVERY item MUST have description, itemType, and itemNumber populated. Never omit description.
4. Use null (not empty string, not omitted) when a value is genuinely unknown.
5. Do NOT define what the codes mean (R1, R2a, SC1 etc.) — just capture them. The spec extraction step resolves the codes.

CRITICAL — coating, lining and class assignment rules (the model has been getting these wrong):
- ONLY assign coatingSystem / liningType / materialClass when the drawing EXPLICITLY tags THIS specific item or spool mark with that code, either via a per-item column, an arrow leader to the item, or a "this mark gets X" annotation.
- Do NOT propagate a code from one mark to another mark just because they appear on the same drawing. Each mark is independent.
- Plain End (P.E.) pipes are very often UNCOATED. If the drawing does NOT explicitly tag a P.E. item with a coating code, set coatingSystem = null. Never default to "R1" or any other code.
- Same rule for lining: if the drawing doesn't show internal lining for this mark, liningType = null. Don't carry over LINATEX from a different mark.
- If a single drawing note says "applies to all marks" or "all items receive R1", THAT is grounds for assigning the code to every mark. Without such a blanket statement, the code only applies where the drawing explicitly marks it.
- When uncertain, prefer null and add a deviations entry like "uncertain whether mark -03 receives R1 — drawing does not show explicit tag" so the user can confirm. Never guess in the field itself.

Also extract drawing-level metadata: project, customer, drawing number, sheet of, revision, date, drawn-by.

Respond ONLY with valid JSON of this exact shape:
{
  "items": [
    {
      "itemNumber": "-01",
      "description": "Pipe",
      "itemType": "pipe",
      "quantity": 6,
      "diameter": 1000,
      "wallThickness": 16,
      "length": 6000,
      "flangeConfig": "F.B.E. F/F",
      "liningType": null,
      "liningThicknessMm": null,
      "coatingSystem": "R2a",
      "materialClass": "1000/3",
      "banding": 0,
      "deviations": [],
      "drawingReference": "HH01",
      "revision": "Sheet 1 Of 9"
    }
  ],
  "specifications": { "referencedCodes": ["R1", "R2a", "1000/3"] },
  "metadata": { "project": "...", "customer": "...", "drawingNumber": "...", "revision": "...", "date": "...", "drawnBy": "..." }
}

'referencedCodes' is the list of paint / material-class / lining codes the drawing cites without defining (so the spec extraction step can resolve them). Mark any uncertain value with confidence < 0.7.`;

/**
 * Specification-role prompt — focused on extracting clause-level facts and,
 * when sibling drawings are present in the session, cross-linking the
 * spec clauses to the items those drawings reference.
 */
function buildAscaSpecificationPrompt(siblings: NixExtraction[]): string {
  const drawingSiblings = siblings.filter((s) => s.documentRole === DocumentRole.DRAWING);
  const referencedCodes = collectReferencedCodes(drawingSiblings);
  const itemSummary = collectItemSummary(drawingSiblings);

  const crossLinkingBlock =
    drawingSiblings.length > 0
      ? `

The user has already uploaded ${drawingSiblings.length} drawing document${
          drawingSiblings.length === 1 ? "" : "s"
        } in this session. Those drawings reference the following codes (likely paint systems, material classes, or lining specs) without defining them — the user is uploading you now to find the definitions:

${referencedCodes.length > 0 ? referencedCodes.map((c) => `  - ${c}`).join("\n") : "  (no codes captured yet)"}

The drawings show these items (item-mark → applicable codes):
${itemSummary || "  (no items captured yet)"}

Where you find a clause defining one of these codes, output it under 'specifications' with the code as a key so the cross-linker can match it. If you find a clause that applies to ALL items in a drawing pack, mark it with applicableScope='all'. If a clause only applies to specific item marks or types, list them in applicableMarks / applicableItemTypes.`
      : "";

  return `You are Nix, extracting clause-level facts from an ASCA (AU Industries Stock Control) customer specification document. The document may cover painting systems, rubber lining, fabrication standards, NDT, surface preparation, material classes, or scope of work.${crossLinkingBlock}

Capture clause-level facts a quoter cares about:
- paint system codes (R1, R2a, R2b, R3 etc.) with full description: primer + intermediate + topcoat, DFT min/max per coat, total DFT, surface profile, surface prep grade like Sa 2.5
- rubber lining material (e.g. Linatex Linard 60), thickness on bore, thickness on flange face, fold-back rules (e.g. "100mm fold-back permitted on plain ends"), vulcanisation method (autoclave / cold-bonded), warranty period
- fabrication / NDT requirements: welding standard, % of butt welds radiographed, MPI on fillets, hydrotest pressure, who pays for NDT (supplier account vs erection-contractor account)
- material class references (e.g. SC1 = SANS 719 Gr.B / SANS 62 / PN10 / BS EN 1092)
- delivery / battery limits / freight responsibility / packaging requirements
- warranty / guarantee periods on coatings or lining
- explicitly listed exclusions ("not in supplier scope")

CRITICAL — items array rules for specification documents:
- The 'items' array MUST be empty ([]) UNLESS the document contains an explicit Bill of Materials TABLE with quantity columns and identifiable line items.
- Do NOT treat individual clauses, sentences, or paragraphs as items.
- Do NOT assign synthetic mark numbers (PDF-1, PDF-2 etc.) to clauses — that is wrong.
- Do NOT fragment a clause into multiple items at sentence boundaries.
- A single specification document with 30 clauses should produce 30 entries under 'specifications', not 30 'items'.
- If you are unsure whether the document has a real BOM, return items=[] — the cross-linker will work fine without it.

CRITICAL — specifications object rules (this is what the quoter actually needs from a spec document):
- The 'specifications' object MUST be populated for every spec document. Returning '{}' on a real specification means the document was wasted.
- Use the clause code (R1, R2a, SC1, 1000/3, 4000/3, etc.) or a short, stable identifier as the KEY — NOT the full sentence.
- For EVERY referenced code in the drawing pack, attempt to find its definition in this document. If a code is defined here, write it as a key with the full breakdown.
- If a code from the drawing pack is NOT found in this document, do NOT add a stub for it — only document codes this spec actually defines.
- For each spec entry, populate 'details' with structured sub-fields a quoter can read directly: e.g. for a paint system: { "primer": "...", "intermediate": "...", "topcoat": "...", "dftMicrons": ..., "surfacePrep": "Sa 2.5" }.
- 'applicableScope' = "all" if the clause applies to every mark on the drawings; "items" if it applies only to specific marks (then list them in 'applicableMarks').

Worked example — a paint-systems specification document might produce:
{
  "items": [],
  "specifications": {
    "R1": {
      "description": "Standard external paint system for non-immersed steelwork",
      "details": { "primer": "Zinc-rich epoxy 75µm", "intermediate": "MIO epoxy 100µm", "topcoat": "Polyurethane 50µm", "totalDftMicrons": 225, "surfacePrep": "Sa 2.5" },
      "applicableScope": "all"
    },
    "R2a": {
      "description": "Heavy-duty external paint system for splash zones",
      "details": { "primer": "Zinc-rich epoxy 75µm", "intermediate": "MIO epoxy 150µm", "topcoat": "Polyurethane 75µm", "totalDftMicrons": 300, "surfacePrep": "Sa 2.5" },
      "applicableScope": "items",
      "applicableMarks": ["-01"]
    },
    "SC1": {
      "description": "Carbon steel material class for low-pressure water service",
      "details": { "pipeStandard": "SANS 719 Gr.B", "fittingStandard": "ASTM A234 WPB", "flangeStandard": "BS EN 1092 PN10", "rating": "PN10" },
      "applicableScope": "all"
    }
  },
  "metadata": { "documentTitle": "...", "revision": "...", "date": "..." }
}

Respond ONLY with valid JSON of the shape:
{
  "items": [],
  "specifications": {
    "<code or short identifier>": { "description": "...", "details": { ... structured fields ... }, "applicableScope": "all" | "items", "applicableMarks": [...], "applicableItemTypes": [...] },
    ...
  },
  "metadata": {...}
}

Mark any uncertain value with confidence < 0.7. Both rules are equally important: items=[] is the correct default for a spec, AND specifications={...} must be populated with the clauses you find. An empty specifications object on a real specification document is a bug.`;
}

/**
 * General-purpose ASCA prompt for documents whose role is unknown.
 */
const ASCA_GENERAL_PROMPT = `You are Nix, extracting quote inputs for ASCA (AU Industries Stock Control). The user has uploaded a document that may be a drawing, a specification, a scope-of-work narrative, or correspondence — identify what it actually is and extract whatever a quoter would need.

Items may be any fabricated industrial product: pipes/spools, bends, fittings, flanges, tanks, chutes, hoppers, conveyor pulleys, drums, screens, launders, underpans, plate work, structural assemblies.

Capture line items where present (with quantity, dimensions, mark, lining, paint code, banding count, deviations) AND clause-level specifications where present (paint systems, lining specs, NDT, scope, warranty). Do not force everything into one shape.

Respond ONLY with valid JSON:
{
  "items": [...],
  "specifications": {...},
  "metadata": {...}
}`;

function collectReferencedCodes(drawingSiblings: NixExtraction[]): string[] {
  const codes = new Set<string>();
  for (const sibling of drawingSiblings) {
    const data = sibling.extractedData as
      | { specifications?: { referencedCodes?: string[] } }
      | undefined;
    const referenced = data?.specifications?.referencedCodes;
    if (Array.isArray(referenced)) {
      for (const code of referenced) {
        if (typeof code === "string" && code.length > 0) codes.add(code);
      }
    }
    // Also harvest from line-item paint/material/lining codes
    const items = sibling.extractedItems ?? [];
    for (const item of items) {
      const itemAny = item as Record<string, unknown>;
      const candidate = itemAny.coatingSystem ?? itemAny.paintSystem ?? itemAny.materialClass;
      if (typeof candidate === "string" && candidate.length > 0) {
        codes.add(candidate);
      }
    }
  }
  return Array.from(codes).slice(0, 50);
}

function collectItemSummary(drawingSiblings: NixExtraction[]): string {
  const lines: string[] = [];
  for (const sibling of drawingSiblings) {
    const items = sibling.extractedItems ?? [];
    for (const item of items.slice(0, 30)) {
      const itemAny = item as Record<string, unknown>;
      const mark =
        (itemAny.itemNumber as string | undefined) ??
        (itemAny.mark as string | undefined) ??
        "(no-mark)";
      const description = (itemAny.description as string | undefined) ?? "";
      const codes: string[] = [];
      const paint = itemAny.coatingSystem ?? itemAny.paintSystem;
      const lining = itemAny.liningType ?? itemAny.lining;
      const cls = itemAny.materialClass;
      if (typeof paint === "string") codes.push(`paint=${paint}`);
      if (typeof lining === "string") codes.push(`lining=${lining}`);
      if (typeof cls === "string") codes.push(`class=${cls}`);
      lines.push(
        `  - ${mark}: ${description.slice(0, 80)}${codes.length > 0 ? ` [${codes.join(", ")}]` : ""}`,
      );
    }
  }
  return lines.slice(0, 60).join("\n");
}
