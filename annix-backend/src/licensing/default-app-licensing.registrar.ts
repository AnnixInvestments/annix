import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { DEFAULT_APP_LICENSING } from "./config/default-app-licensing";
import { FeatureRegistry } from "./feature-registry.service";

@Injectable()
export class DefaultAppLicensingRegistrar implements OnModuleInit {
  private readonly logger = new Logger(DefaultAppLicensingRegistrar.name);

  constructor(private readonly registry: FeatureRegistry) {}

  onModuleInit(): void {
    DEFAULT_APP_LICENSING.forEach((definition) => {
      this.registry.register(definition);
    });
    this.logger.log(`Registered ${DEFAULT_APP_LICENSING.length} default app licensing definitions`);
  }
}
