import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { FeatureRegistry } from "../licensing";
import {
  ANNIX_ORBIT_RECRUITER_LICENSING,
  ANNIX_ORBIT_RECRUITER_MODULE_KEY,
} from "./config/annix-orbit-recruiter-licensing";

@Injectable()
export class AnnixOrbitRecruiterLicensingRegistrar implements OnModuleInit {
  private readonly logger = new Logger(AnnixOrbitRecruiterLicensingRegistrar.name);

  constructor(private readonly registry: FeatureRegistry) {}

  onModuleInit(): void {
    this.registry.register(ANNIX_ORBIT_RECRUITER_LICENSING);
    this.logger.log(`Registered licensing definition for "${ANNIX_ORBIT_RECRUITER_MODULE_KEY}"`);
  }
}
