import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { FeatureRegistry } from "../licensing";
import { ANNIX_ORBIT_LICENSING, ANNIX_ORBIT_MODULE_KEY } from "./config/annix-orbit-licensing";

@Injectable()
export class AnnixOrbitLicensingRegistrar implements OnModuleInit {
  private readonly logger = new Logger(AnnixOrbitLicensingRegistrar.name);

  constructor(private readonly registry: FeatureRegistry) {}

  onModuleInit(): void {
    this.registry.register(ANNIX_ORBIT_LICENSING);
    this.logger.log(`Registered licensing definition for "${ANNIX_ORBIT_MODULE_KEY}"`);
  }
}
