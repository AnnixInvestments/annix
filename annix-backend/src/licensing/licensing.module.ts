import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { ModuleCatalogOverride } from "./entities/module-catalog-override.entity";
import { ModuleLicense } from "./entities/module-license.entity";
import { FeatureLicenseGuard } from "./feature-license.guard";
import { FeatureRegistry } from "./feature-registry.service";
import { LicensingService } from "./licensing.service";
import { LicensingAdminController } from "./licensing-admin.controller";
import { LicensingCatalogController } from "./licensing-catalog.controller";
import { LicensingCatalogService } from "./licensing-catalog.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ModuleLicense, ModuleCatalogOverride]),
    FeatureFlagsModule,
    AdminModule,
  ],
  controllers: [LicensingCatalogController, LicensingAdminController],
  providers: [FeatureRegistry, LicensingService, LicensingCatalogService, FeatureLicenseGuard],
  exports: [FeatureRegistry, LicensingService, LicensingCatalogService, FeatureLicenseGuard],
})
export class LicensingModule {}
