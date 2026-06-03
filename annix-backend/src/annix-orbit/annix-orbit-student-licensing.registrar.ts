import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { FeatureRegistry } from "../licensing";
import {
  ANNIX_ORBIT_STUDENT_LICENSING,
  ANNIX_ORBIT_STUDENT_MODULE_KEY,
} from "./config/annix-orbit-student-licensing";

@Injectable()
export class AnnixOrbitStudentLicensingRegistrar implements OnModuleInit {
  private readonly logger = new Logger(AnnixOrbitStudentLicensingRegistrar.name);

  constructor(private readonly registry: FeatureRegistry) {}

  onModuleInit(): void {
    this.registry.register(ANNIX_ORBIT_STUDENT_LICENSING);
    this.logger.log(`Registered licensing definition for "${ANNIX_ORBIT_STUDENT_MODULE_KEY}"`);
  }
}
