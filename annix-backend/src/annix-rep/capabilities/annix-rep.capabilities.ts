import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { INixCapability } from "../../nix/capabilities";
import { NixCapabilityRegistry } from "../../nix/capabilities";

@Injectable()
export class AnnixRepCapabilities implements OnModuleInit {
  private readonly logger = new Logger(AnnixRepCapabilities.name);

  constructor(private readonly registry: NixCapabilityRegistry) {}

  onModuleInit(): void {
    for (const capability of this.capabilities()) {
      this.registry.register(capability);
    }
    this.logger.log(`Registered ${this.capabilities().length} Annix Rep capabilities`);
  }

  private capabilities(): INixCapability[] {
    return [
      {
        key: "annix-rep.log-discovery-call",
        appCode: "annix-rep",
        label: "Log a discovery call",
        description:
          "Capture a sales discovery call — prospect, industry, pain points, next steps.",
        intents: ["log discovery", "discovery call", "log meeting", "capture meeting"],
      },
      {
        key: "annix-rep.find-prospects",
        appCode: "annix-rep",
        label: "Find new prospects",
        description: "Search for prospects in a target industry / sub-industry / product category.",
        intents: ["find prospects", "search prospects", "new leads", "find leads"],
      },
      {
        key: "annix-rep.transcribe-meeting",
        appCode: "annix-rep",
        label: "Transcribe a recorded meeting",
        description:
          "Upload or capture a meeting recording and have Nix transcribe + extract action items.",
        intents: ["transcribe meeting", "upload recording", "meeting notes"],
      },
      {
        key: "annix-rep.weekly-report",
        appCode: "annix-rep",
        label: "Generate a weekly report",
        description:
          "Pull this week's discovery calls, prospects worked, and pipeline status into a report.",
        intents: ["weekly report", "rep report", "sales report"],
      },
    ];
  }
}
