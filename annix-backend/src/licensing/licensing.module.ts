import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { ModuleLicense } from "./entities/module-license.entity";
import { FeatureLicenseGuard } from "./feature-license.guard";
import { FeatureRegistry } from "./feature-registry.service";
import { LicensingService } from "./licensing.service";
import { LicensingCatalogController } from "./licensing-catalog.controller";
import { LicensingCatalogService } from "./licensing-catalog.service";

@Module({
  imports: [TypeOrmModule.forFeature([ModuleLicense]), FeatureFlagsModule],
  controllers: [LicensingCatalogController],
  providers: [FeatureRegistry, LicensingService, LicensingCatalogService, FeatureLicenseGuard],
  exports: [FeatureRegistry, LicensingService, LicensingCatalogService, FeatureLicenseGuard],
})
export class LicensingModule {}
