import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { INixCapability } from "../../../nix/capabilities";
import { NixCapabilityRegistry } from "../../../nix/capabilities";

@Injectable()
export class ComplySaCapabilities implements OnModuleInit {
  private readonly logger = new Logger(ComplySaCapabilities.name);

  constructor(private readonly registry: NixCapabilityRegistry) {}

  onModuleInit(): void {
    for (const capability of this.capabilities()) {
      this.registry.register(capability);
    }
    this.logger.log(`Registered ${this.capabilities().length} Comply SA capabilities`);
  }

  private capabilities(): INixCapability[] {
    return [
      {
        key: "comply-sa.run-compliance-check",
        appCode: "comply-sa",
        label: "Run a compliance check",
        description: "Walk through running a SA regulatory compliance check on a client.",
        intents: ["compliance check", "run audit", "regulatory check", "audit client"],
      },
      {
        key: "comply-sa.advisor-question",
        appCode: "comply-sa",
        label: "Ask the AI advisor",
        description: "Ask Nix a regulatory or compliance question grounded in SA law.",
        intents: ["ask advisor", "compliance question", "regulatory question", "is this compliant"],
      },
      {
        key: "comply-sa.bee-status",
        appCode: "comply-sa",
        label: "Check BEE status",
        description: "Walk through capturing or verifying a B-BBEE certificate.",
        intents: ["bee status", "bee certificate", "b-bbee", "bee scorecard"],
      },
    ];
  }
}
