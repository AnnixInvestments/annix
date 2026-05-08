import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { INixCapability } from "../../nix/capabilities";
import { NixCapabilityRegistry } from "../../nix/capabilities";

/**
 * Pilot capability registration for Teacher Assistant (ref #262 Phase 2).
 *
 * Registers Teacher Assistant's user-facing Nix capabilities into the shared
 * NixCapabilityRegistry on bootstrap. The frontend NixAppProvider with
 * appCode="teacher-assistant" reads these to surface chat intent hints.
 *
 * Phase 2 keeps this thin — just label + intents + guide-slug pointer.
 * Phase 4 walkthrough mode will read the guide for step-by-step UX.
 */
@Injectable()
export class TeacherAssistantCapabilities implements OnModuleInit {
  private readonly logger = new Logger(TeacherAssistantCapabilities.name);

  constructor(private readonly registry: NixCapabilityRegistry) {}

  onModuleInit(): void {
    for (const capability of this.capabilities()) {
      this.registry.register(capability);
    }
    this.logger.log(`Registered ${this.capabilities().length} Teacher Assistant capabilities`);
  }

  private capabilities(): INixCapability[] {
    return [
      {
        key: "teacher-assistant.generate-assignment",
        appCode: "teacher-assistant",
        label: "Generate an assignment",
        description: "Walk through generating a structured classroom assignment with rubric.",
        intents: [
          "generate assignment",
          "create assignment",
          "create worksheet",
          "generate worksheet",
          "make a lesson",
        ],
        guideSlug: "getting-started",
      },
      {
        key: "teacher-assistant.suggest-objectives",
        appCode: "teacher-assistant",
        label: "Suggest learning objectives",
        description: "Help craft learning objectives for a topic and age bucket.",
        intents: [
          "suggest learning objectives",
          "what should students learn",
          "learning outcomes",
          "objectives for",
        ],
      },
      {
        key: "teacher-assistant.fill-section",
        appCode: "teacher-assistant",
        label: "Auto-fill a lesson section",
        description: "Generate content for a specific section of an existing assignment.",
        intents: ["fill section", "expand section", "complete this part"],
      },
    ];
  }
}
