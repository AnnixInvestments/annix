import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DocumentRole, type NixExtraction } from "../../nix/entities/nix-extraction.entity";
import type {
  ExtractionProfileContext,
  ExtractionProfileResult,
  IExtractionProfileHandler,
} from "../../nix/profiles";
import { NixExtractionProfileRegistry } from "../../nix/profiles";
import { composeDrawingPrompt } from "../../nix/prompts/drawing-item-schema.prompt";

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
 * Drawing-role prompt — composes ASCA-specific framing around the SHARED
 * Nix drawing schema rules (per-app schema would drift; the canonical
 * drawing-item-schema.prompt is the single source of truth used by every
 * app's drawing extractor).
 */
const ASCA_DRAWING_PROMPT = composeDrawingPrompt({
  intro:
    "You are Nix, extracting line items from an ASCA (AU Industries Stock Control) workshop / spool / fabrication drawing. The user will upload spec documents separately, so do NOT try to define the paint or lining systems here — just capture the codes the drawing references and the item-level data.",
  itemTypesGuidance:
    "Items may be any fabricated industrial product: pipes/spools, bends, fittings, flanges, tanks, chutes, hoppers, conveyor pulleys, drums, screens, launders, underpans, plate work, structural assemblies. Identify what the drawing actually shows — do not force everything into a pipes-only shape.",
  closing: `Also extract drawing-level metadata: project, customer, drawing number, sheet of, revision, date, drawn-by.

'referencedCodes' is the list of paint / material-class / lining codes the drawing cites without defining (so the spec extraction step can resolve them). Mark any uncertain value with confidence < 0.7.`,
});

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

CRITICAL — cross-reference rule (the model has been getting this wrong: it promotes references to other files into clauses ON the current file, which clutters the wrong document):
- If a clause in THIS document merely REFERENCES another sibling document by name or document number (e.g. "Internal rubber lining per LHM-0000-EP-2701-012-00", "see external corrosion spec LHU-0000-EJ-2701-001-03", "as per painting spec EP-2701-009"), DO NOT include it as a clause here.
- Pointer clauses without their own definition belong on the document being referenced, NOT on this one. The cross-linker resolves them to the right place when the user uploads that other document.
- A clause is a real definition (and SHOULD be included here) only when this document gives the actual values: thicknesses, materials, DFT, hardness, NDT %, etc. If all the document says is "see X for the rubber lining requirements", that's a pointer — skip it.
- A scope-of-work / index document that's nothing but pointers can correctly produce specifications={}. The cross-linker still resolves the references against the sibling extractions.
- For each spec entry, populate 'details' with structured sub-fields a quoter can read directly: e.g. for a paint system: { "primer": "...", "intermediate": "...", "topcoat": "...", "dftMicrons": ..., "surfacePrep": "Sa 2.5", "topcoatColour": "RAL 7035 / off-white" }.
- COLOUR — when the spec gives a final-coat colour, RAL number, or Munsell reference, capture it as 'topcoatColour' (string) on the relevant paint-system sub-object. If the document gives multiple colour options or one per service, pick the one explicitly called out as final / topcoat / specified.
- DFT pairing — when a spec lists multiple paint systems (e.g. paintSystemStoncor, paintSystemCorrocoat, paintSystemGeneric), KEEP THEM AS SEPARATE NESTED OBJECTS under 'details'. Inside each system, name the field <coatName>DftMicrons (primerDftMicrons, topcoatDftMicrons, barrierCoatDftMicrons, finishingCoatAboveWaterlineDftMicrons) so the cross-link UI can pair each product name with its DFT range.
- 'applicableScope' = "all" if the clause applies to every mark on the drawings; "items" if it applies only to specific marks (then list them in 'applicableMarks').
- 'pageReference' (number, REQUIRED) = the page number in THIS PDF where the clause appears, so the user can click the clause and jump straight to that page to verify. If the clause spans multiple pages, give the page where the heading / definition starts.
- 'summary' (string, REQUIRED, ≤ 100 chars) = a one-line plain-English summary the user can read at a glance without expanding the details — e.g. for rubber lining: "6 mm bore, 3 mm flange face, hot-bonded, autoclave-vulcanised". Lead with the numbers/values that matter most for quoting.

Worked example — a paint-systems specification document might produce:
{
  "items": [],
  "specifications": {
    "R1": {
      "summary": "Primer Sa 2.5 + MIO + PU topcoat, 225µm DFT total",
      "description": "Standard external paint system for non-immersed steelwork",
      "details": { "primer": "Zinc-rich epoxy 75µm", "intermediate": "MIO epoxy 100µm", "topcoat": "Polyurethane 50µm", "totalDftMicrons": 225, "surfacePrep": "Sa 2.5" },
      "applicableScope": "all",
      "pageReference": 3
    },
    "R2a": {
      "summary": "Heavy-duty splash-zone system, 300µm DFT total, on -01 only",
      "description": "Heavy-duty external paint system for splash zones",
      "details": { "primer": "Zinc-rich epoxy 75µm", "intermediate": "MIO epoxy 150µm", "topcoat": "Polyurethane 75µm", "totalDftMicrons": 300, "surfacePrep": "Sa 2.5" },
      "applicableScope": "items",
      "applicableMarks": ["-01"],
      "pageReference": 4
    },
    "SC1": {
      "summary": "PN10 carbon steel — SANS 719 Gr.B / A234 WPB / EN 1092",
      "description": "Carbon steel material class for low-pressure water service",
      "details": { "pipeStandard": "SANS 719 Gr.B", "fittingStandard": "ASTM A234 WPB", "flangeStandard": "BS EN 1092 PN10", "rating": "PN10" },
      "applicableScope": "all",
      "pageReference": 7
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
