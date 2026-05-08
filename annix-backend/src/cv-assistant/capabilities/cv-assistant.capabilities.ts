import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { INixCapability } from "../../nix/capabilities";
import { NixCapabilityRegistry } from "../../nix/capabilities";

/**
 * CV Assistant Nix capability registration (ref #262 Phase 3).
 *
 * Surfaces CV Assistant's user-facing AI features to the shared
 * NixCapabilityRegistry so the per-app NixAppProvider can render the
 * right intent suggestions and walkthrough hooks.
 */
@Injectable()
export class CvAssistantCapabilities implements OnModuleInit {
  private readonly logger = new Logger(CvAssistantCapabilities.name);

  constructor(private readonly registry: NixCapabilityRegistry) {}

  onModuleInit(): void {
    for (const capability of this.capabilities()) {
      this.registry.register(capability);
    }
    this.logger.log(`Registered ${this.capabilities().length} CV Assistant capabilities`);
  }

  private capabilities(): INixCapability[] {
    return [
      {
        key: "cv-assistant.post-job",
        appCode: "cv-assistant",
        label: "Post a job with Nix",
        description:
          "Walk through the six-step job-posting wizard with Nix's live suggestions and inline warnings.",
        intents: [
          "post a job",
          "create job posting",
          "advertise role",
          "new vacancy",
          "post vacancy",
        ],
        guideSlug: "posting-a-job-with-nix",
      },
      {
        key: "cv-assistant.run-ee-report",
        appCode: "cv-assistant",
        label: "Run an Employment Equity report",
        description:
          "Generate a compliance-aware EE report with workforce profile, sectoral targets, and disparate-impact monitoring.",
        intents: [
          "run ee report",
          "employment equity report",
          "ee compliance",
          "generate ee analysis",
        ],
        guideSlug: "running-an-ee-compliance-report",
      },
      {
        key: "cv-assistant.analyze-cv",
        appCode: "cv-assistant",
        label: "Analyse a CV",
        description:
          "Get a structured score, ranking potential, strengths, and improvement areas for a CV.",
        intents: ["analyse cv", "analyze cv", "review my cv", "rate this cv", "score my resume"],
      },
      {
        key: "cv-assistant.match-candidates",
        appCode: "cv-assistant",
        label: "Match candidates to a job",
        description:
          "Score and rank candidate CVs against a job posting using Nix's match analysis.",
        intents: [
          "match candidates",
          "rank candidates",
          "best matches for this job",
          "find candidates",
        ],
      },
      {
        key: "cv-assistant.email-template",
        appCode: "cv-assistant",
        label: "Draft a candidate email",
        description:
          "Have Nix draft a personalised candidate email — invite, reject, or follow up.",
        intents: [
          "draft email",
          "compose email",
          "write email to candidate",
          "rejection email",
          "interview invite",
        ],
      },
    ];
  }
}
