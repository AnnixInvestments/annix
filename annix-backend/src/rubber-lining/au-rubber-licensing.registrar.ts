import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { FeatureRegistry } from "../licensing";
import { AU_RUBBER_LICENSING, AU_RUBBER_MODULE_KEY } from "./config/au-rubber-licensing";

@Injectable()
export class AuRubberLicensingRegistrar implements OnModuleInit {
  private readonly logger = new Logger(AuRubberLicensingRegistrar.name);

  constructor(private readonly registry: FeatureRegistry) {}

  onModuleInit(): void {
    this.registry.register(AU_RUBBER_LICENSING);
    this.logger.log(`Registered licensing definition for "${AU_RUBBER_MODULE_KEY}"`);
  }
}
