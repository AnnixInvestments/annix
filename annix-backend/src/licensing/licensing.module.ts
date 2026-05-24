import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { ModuleCatalogOverride } from "./entities/module-catalog-override.entity";
import { ModuleLicense } from "./entities/module-license.entity";
import { PromoCode } from "./entities/promo-code.entity";
import { PromoCodeRedemption } from "./entities/promo-code-redemption.entity";
import { FeatureLicenseGuard } from "./feature-license.guard";
import { FeatureRegistry } from "./feature-registry.service";
import { LicensingService } from "./licensing.service";
import { LicensingAdminController } from "./licensing-admin.controller";
import { LicensingCatalogController } from "./licensing-catalog.controller";
import { LicensingCatalogService } from "./licensing-catalog.service";
import { PromoCodeService } from "./promo-code.service";
import { PromoCodeAdminController } from "./promo-code-admin.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModuleLicense,
      ModuleCatalogOverride,
      PromoCode,
      PromoCodeRedemption,
    ]),
    FeatureFlagsModule,
    AdminModule,
  ],
  controllers: [LicensingCatalogController, LicensingAdminController, PromoCodeAdminController],
  providers: [
    FeatureRegistry,
    LicensingService,
    LicensingCatalogService,
    PromoCodeService,
    FeatureLicenseGuard,
  ],
  exports: [
    FeatureRegistry,
    LicensingService,
    LicensingCatalogService,
    PromoCodeService,
    FeatureLicenseGuard,
  ],
})
export class LicensingModule {}
