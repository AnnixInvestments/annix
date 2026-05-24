import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { INixCapability } from "../../nix/capabilities";
import { NixCapabilityRegistry } from "../../nix/capabilities";

/**
 * FuturePath (orbit-education) Nix capabilities. Surfaces the grounded education
 * mentor to the shared NixCapabilityRegistry so the per-app Nix provider can
 * offer the right intents. Registered against the existing `annix-orbit` app.
 */
@Injectable()
export class AnnixOrbitEducationCapabilities implements OnModuleInit {
  private readonly logger = new Logger(AnnixOrbitEducationCapabilities.name);

  constructor(private readonly registry: NixCapabilityRegistry) {}

  onModuleInit(): void {
    const capabilities = this.capabilities();
    for (const capability of capabilities) {
      this.registry.register(capability);
    }
    this.logger.log(`Registered ${capabilities.length} Annix Orbit education capabilities`);
  }

  private capabilities(): INixCapability[] {
    return [
      {
        key: "annix-orbit-education.mentor",
        appCode: "annix-orbit",
        label: "Ask the FuturePath mentor",
        description:
          "Get grounded guidance on study choices, university fit and funding — reasoned over curated data, not free-form facts. Not a substitute for a counsellor.",
        intents: [
          "what should i study",
          "which university",
          "help me choose a course",
          "career advice",
          "funding options",
          "bursary help",
        ],
        guideSlug: "futurepath-mentor",
      },
    ];
  }
}
