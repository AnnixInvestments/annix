import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { INixCapability } from "../../nix/capabilities";
import { NixCapabilityRegistry } from "../../nix/capabilities";

/**
 * AU Rubber Nix capability registration (ref #262 Phase 3).
 *
 * AU Rubber has no how-to guides yet — capabilities here surface chat
 * intents but no walkthroughs. Phase 4 prerequisite: write guides under
 * annix-frontend/src/app/au-rubber/how-to/guides/ before walkthrough mode
 * lands for this app.
 */
@Injectable()
export class AuRubberCapabilities implements OnModuleInit {
  private readonly logger = new Logger(AuRubberCapabilities.name);

  constructor(private readonly registry: NixCapabilityRegistry) {}

  onModuleInit(): void {
    for (const capability of this.capabilities()) {
      this.registry.register(capability);
    }
    this.logger.log(`Registered ${this.capabilities().length} AU Rubber capabilities`);
  }

  private capabilities(): INixCapability[] {
    return [
      {
        key: "au-rubber.extract-supplier-coc",
        appCode: "au-rubber",
        label: "Extract supplier CoC",
        description:
          "Drop a Compounder or Calenderer Certificate of Conformance and have Nix extract batch numbers, hardness, and chemistry.",
        intents: [
          "extract supplier coc",
          "upload coc",
          "process certificate",
          "compounder coc",
          "calenderer coc",
        ],
      },
      {
        key: "au-rubber.extract-delivery-note",
        appCode: "au-rubber",
        label: "Extract a delivery note",
        description: "Process an incoming or outgoing rubber delivery note via Nix.",
        intents: ["extract delivery note", "process delivery", "upload delivery note", "log dn"],
      },
      {
        key: "au-rubber.extract-tax-invoice",
        appCode: "au-rubber",
        label: "Extract a tax invoice",
        description: "Drop a customer or supplier tax invoice and have Nix parse line items.",
        intents: ["extract tax invoice", "process invoice", "upload invoice", "tax invoice"],
      },
      {
        key: "au-rubber.issue-rubber-roll",
        appCode: "au-rubber",
        label: "Issue a rubber roll",
        description:
          "Photo-based rubber roll identification, multi-JC issuing, and return tracking.",
        intents: ["issue rubber roll", "issue roll", "rubber issuing", "calender roll"],
      },
      {
        key: "au-rubber.match-roll-to-coc",
        appCode: "au-rubber",
        label: "Match Calender Roll to CoCs",
        description:
          "Cross-link a Calender Roll CoC to its sibling Compounder/Calenderer CoCs via batch numbers.",
        intents: ["match roll", "link cocs", "calender roll cocs"],
      },
    ];
  }
}
