import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { ModuleLicense } from "./entities/module-license.entity";
import { FeatureLicenseGuard } from "./feature-license.guard";
import { FeatureRegistry } from "./feature-registry.service";
import { LicensingService } from "./licensing.service";

@Module({
  imports: [TypeOrmModule.forFeature([ModuleLicense]), FeatureFlagsModule],
  providers: [FeatureRegistry, LicensingService, FeatureLicenseGuard],
  exports: [FeatureRegistry, LicensingService, FeatureLicenseGuard],
})
export class LicensingModule {}
