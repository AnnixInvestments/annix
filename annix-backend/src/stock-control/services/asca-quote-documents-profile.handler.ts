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

For each line item, capture (where applicable to the item type):
- quantity (qty)
- principal dimensions: pipe-shaped items use nominal bore (NB, mm) + wall thickness (WT, mm) + length; assemblies use overall L × W × H or item-specific dimensions (e.g. pulley OD × face width × shaft Ø)
- end configuration if applicable: P.E. (plain end), F.B.E. (flanged both ends), F/PE (one flanged one plain), or the drawing's own wording
- mark / spool / item number (e.g. -01, -02, HH01-HH09, P1)
- internal lining: material + thickness on the principal surface AND thickness on flange face / sealing face when DIFFERENT from the bore (e.g. "6 mm Linatex Linard 60 bore + 6 mm on flange face, no overlap joint" — capture both values when the drawing or red-pen markup shows a different value from the standard 3 mm spec return)
- external paint system reference (e.g. "R1", "R2a") — capture the code only; the spec doc defines what it means
- material class reference (e.g. "SC1") — same: capture the code, the spec doc defines it
- banding: count the number of identification bands shown PER ITEM — banding is priced PER BAND not per item, so the count matters
- handwritten / red-pen / coloured-pen client deviations from the printed spec — surface SEPARATELY in a 'deviations' field, do NOT silently merge into the printed values
- drawing reference and revision

Also extract drawing-level metadata: project, customer, drawing number, sheet of, revision, date, drawn-by.

Respond ONLY with valid JSON of the shape:
{
  "items": [...],
  "specifications": { "referencedCodes": [...] },
  "metadata": {...}
}

Where 'referencedCodes' is the list of paint / material-class / lining codes the drawing cites without defining (so the spec extraction step can resolve them). Mark any uncertain value with confidence < 0.7.`;

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

Specifications shape — every clause-level fact goes here, keyed by its code or short title:

Respond ONLY with valid JSON of the shape:
{
  "items": [],
  "specifications": {
    "<code or short title>": { "description": "...", "details": {...}, "applicableScope": "all" | "items", "applicableMarks": [...], "applicableItemTypes": [...] },
    ...
  },
  "metadata": {...}
}

Mark any uncertain value with confidence < 0.7. Reminder: items=[] is the correct default for a specification document — only deviate if you find a real BOM.`;
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
