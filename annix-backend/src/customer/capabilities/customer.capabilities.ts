import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { INixCapability } from "../../nix/capabilities";
import { NixCapabilityRegistry } from "../../nix/capabilities";

@Injectable()
export class CustomerCapabilities implements OnModuleInit {
  private readonly logger = new Logger(CustomerCapabilities.name);

  constructor(private readonly registry: NixCapabilityRegistry) {}

  onModuleInit(): void {
    for (const capability of this.capabilities()) {
      this.registry.register(capability);
    }
    this.logger.log(`Registered ${this.capabilities().length} Customer portal capabilities`);
  }

  private capabilities(): INixCapability[] {
    return [
      {
        key: "customer.submit-rfq",
        appCode: "customer",
        label: "Submit an RFQ",
        description:
          "Walk through submitting a new RFQ — drop a BOQ, fill project details, review.",
        intents: ["submit rfq", "new rfq", "request a quote", "create rfq"],
      },
      {
        key: "customer.extract-boq",
        appCode: "customer",
        label: "Extract a BOQ",
        description: "Drop a BOQ document or .eml and Nix will extract line items.",
        intents: ["extract boq", "upload boq", "process boq"],
      },
      {
        key: "customer.track-quotes",
        appCode: "customer",
        label: "Track quote responses",
        description: "View supplier quotes against your open RFQs and pick winners.",
        intents: ["track quotes", "view quotes", "quote responses"],
      },
      {
        key: "customer.verify-registration",
        appCode: "customer",
        label: "Verify your registration documents",
        description:
          "Upload VAT, registration, or BEE documents and have Nix verify them against your company profile.",
        intents: ["verify documents", "upload vat", "registration documents"],
      },
    ];
  }
}
