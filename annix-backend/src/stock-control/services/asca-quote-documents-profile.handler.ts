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
    return [
      "You are extracting line items and specification clauses from a customer quote pack for ASCA (AU Industries Stock Control / Annix).",
      "Inputs may include workshop drawings (pipe spool sheets with quantities, sizes, lengths, marks), customer painting/rubber-lining specifications, and project scope documents.",
      "For each line item, capture: quantity, NB / nominal bore, wall thickness, length (mm), end configuration (P.E. plain end / F.B.E. flanged-both-ends), mark/spool number, applicable paint system reference (e.g. R1, R2a) and applicable rubber lining (e.g. 6mm Linatex Linard 60, with flange-face return thickness).",
      "Note any handwritten / red-pen client deviations from the printed spec separately so they can be priced as variations.",
      "Banding (colour-coded identification bands) is priced per band — capture band counts explicitly when shown on drawings.",
    ].join(" ");
  }
}
