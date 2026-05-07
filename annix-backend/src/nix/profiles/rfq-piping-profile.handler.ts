import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { NixExtraction } from "../entities/nix-extraction.entity";
import type {
  ExtractionProfileContext,
  ExtractionProfileResult,
  IExtractionProfileHandler,
} from "./extraction-profile-handler.interface";
import { NixExtractionProfileRegistry } from "./nix-extraction-profile-registry.service";

@Injectable()
export class RfqPipingProfileHandler implements IExtractionProfileHandler, OnModuleInit {
  private readonly logger = new Logger(RfqPipingProfileHandler.name);
  readonly profileKey = "rfq-piping";
  readonly label = "RFQ — Piping & fabrication";
  readonly sourceModule = "rfq";

  constructor(private readonly registry: NixExtractionProfileRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async postExtract(
    extraction: NixExtraction,
    _context: ExtractionProfileContext,
  ): Promise<ExtractionProfileResult> {
    this.logger.debug(
      `rfq-piping postExtract called for extraction #${extraction.id} (rfqId=${extraction.rfqId ?? "n/a"}). Existing RFQ flow already handles item parsing and clarifications, so this handler is currently a no-op pass-through.`,
    );
    return {};
  }

  systemPrompt(): string | undefined {
    // Defer to DEFAULT_EXTRACTION_SYSTEM_PROMPT — already broadened in #253
    // task A to cover the full RFQ vocabulary (pipes, bends, fittings,
    // valves, instruments, pumps, tank/chute assemblies, plate work).
    // Returning undefined keeps the fall-through clean rather than
    // duplicating the default.
    return undefined;
  }
}
