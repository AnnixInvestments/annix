import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { INixCapability } from "../../nix/capabilities";
import { NixCapabilityRegistry } from "../../nix/capabilities";

@Injectable()
export class SupplierCapabilities implements OnModuleInit {
  private readonly logger = new Logger(SupplierCapabilities.name);

  constructor(private readonly registry: NixCapabilityRegistry) {}

  onModuleInit(): void {
    for (const capability of this.capabilities()) {
      this.registry.register(capability);
    }
    this.logger.log(`Registered ${this.capabilities().length} Supplier portal capabilities`);
  }

  private capabilities(): INixCapability[] {
    return [
      {
        key: "supplier.respond-to-boq",
        appCode: "supplier",
        label: "Respond to a BOQ",
        description: "Walk through pricing line items and submitting a supplier quote.",
        intents: ["respond to boq", "quote boq", "price items", "submit quote"],
      },
      {
        key: "supplier.respond-to-pump-quote",
        appCode: "supplier",
        label: "Respond to a pump quote request",
        description: "Quote a pump request — duty point, materials, delivery.",
        intents: ["pump quote", "respond to pump", "price pump"],
      },
      {
        key: "supplier.verify-registration",
        appCode: "supplier",
        label: "Verify your registration documents",
        description: "Upload VAT, registration, or BEE documents during signup or profile updates.",
        intents: ["verify documents", "upload registration", "vat document"],
      },
    ];
  }
}
