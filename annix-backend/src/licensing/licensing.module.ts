import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { Company } from "../platform/entities/company.entity";
import { RbacModule } from "../rbac/rbac.module";
import { User } from "../user/entities/user.entity";
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
import { TenancyService } from "./tenancy.service";
import { TenancyAdminController } from "./tenancy-admin.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModuleLicense,
      ModuleCatalogOverride,
      PromoCode,
      PromoCodeRedemption,
      Company,
      User,
    ]),
    FeatureFlagsModule,
    AdminModule,
    RbacModule,
  ],
  controllers: [
    LicensingCatalogController,
    LicensingAdminController,
    PromoCodeAdminController,
    TenancyAdminController,
  ],
  providers: [
    FeatureRegistry,
    LicensingService,
    LicensingCatalogService,
    PromoCodeService,
    TenancyService,
    FeatureLicenseGuard,
  ],
  exports: [
    FeatureRegistry,
    LicensingService,
    LicensingCatalogService,
    PromoCodeService,
    TenancyService,
    FeatureLicenseGuard,
  ],
})
export class LicensingModule {}
