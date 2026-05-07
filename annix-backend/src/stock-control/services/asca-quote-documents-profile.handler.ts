import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { NixExtraction } from "../../nix/entities/nix-extraction.entity";
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
      `asca-quote-documents postExtract — extraction #${extraction.id}, sourceId=${extraction.sourceId ?? "n/a"}, document="${extraction.documentName}", extractedItems=${itemCount}`,
    );
    return {
      metadata: {
        profile: this.profileKey,
        extractedItemCount: itemCount,
      },
    };
  }

  systemPrompt(): string {
    return `You are Nix, extracting quote inputs for ASCA (AU Industries Stock Control). The user has uploaded customer quote-pack documents — drawings and specifications, in any combination, for any fabricated industrial item AU may quote: pipes and spools, bends, fittings, flanges, tanks, chutes, hoppers, conveyor pulleys, drums, screens, launders, underpans, plate work, structural steel, or bespoke assemblies. Identify what's actually on the document — do not force it into a pipes-only shape.

For each fabricated line item on a drawing, capture (where applicable to the item type):
- quantity (qty)
- principal dimensions: for pipe-shaped items use nominal bore (NB, mm) + wall thickness (WT, mm) + length; for assemblies use overall L × W × H or item-specific dimensions (e.g. pulley OD × face width × shaft Ø)
- end configuration if applicable: P.E. (plain end), F.B.E. (flanged both ends), F/PE (one flanged one plain), or the drawing's own wording
- mark / spool / item number (e.g. -01, -02, HH01-HH09, P1)
- internal lining: material + thickness on the principal surface AND thickness on flange face / sealing face when different (e.g. "6 mm Linatex Linard 60 bore + 6 mm on flange face, no overlap joint" — capture both values when the drawing or red-pen markup shows a difference from the standard 3 mm spec return)
- external paint system reference (e.g. "R1", "R2a") and which spec doc / clause defines it
- banding: count the number of identification bands shown per item — banding is priced PER BAND not per item, so the count matters
- any handwritten / red-pen / coloured-pen client deviations from the printed spec — these are priced as variations and must surface SEPARATELY, not silently merged into the printed values
- drawing reference and revision

For each specification document, capture clause-level facts a quoter cares about:
- paint system codes (R1, R2a, R2b, R3 etc.) with full description (primer + intermediate + topcoat, DFT min/max per coat, total DFT, surface profile, surface prep grade like Sa 2.5)
- rubber lining material (e.g. Linatex Linard 60), thickness on bore, thickness on flange face, fold-back rules (e.g. "100mm fold-back permitted on plain ends"), vulcanisation method (autoclave / cold-bonded)
- fabrication / NDT requirements: welding standard, % of butt welds radiographed, MPI on fillets, hydrotest pressure, who pays for NDT (supplier account vs erection-contractor account)
- material class references (e.g. SC1 = SANS 719 Gr.B / SANS 62 / PN10 / BS EN 1092)
- delivery / battery limits / freight responsibility / packaging requirements
- warranty / guarantee periods on coatings or lining

Cross-link drawings to specs where the link is explicit. When the drawing says only "R1" or "R2a", the spec doc is the source of truth for what that code means — surface that linkage so a quoter sees both at once.

Do NOT force every document into a "list of items" shape. A spec document is mostly clauses, not line items. A scope document is mostly process and exclusions. Capture each document for what it actually is.

Respond ONLY with valid JSON of the shape:
{
  "items": [...],
  "specifications": {...},
  "metadata": {...}
}

Where "items" is line-item-shaped objects (mostly from drawings), "specifications" is cross-document clause-level facts, and "metadata" includes projectName, projectReference, projectLocation, customer (if shown).

Focus on accuracy. Mark any field you're unsure about with a confidence below 0.7 and a note in the description.`;
  }
}
