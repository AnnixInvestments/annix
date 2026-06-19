import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { CompanyRepository } from "../platform/company.repository";
import { MongoCompanyRepository } from "../platform/company.repository.mongo";
import { CompanySchema } from "../platform/schemas/company.schema";
import { RbacModule } from "../rbac/rbac.module";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { DefaultAppLicensingRegistrar } from "./default-app-licensing.registrar";
import { FeatureLicenseGuard } from "./feature-license.guard";
import { FeatureRegistry } from "./feature-registry.service";
import { LicensingService } from "./licensing.service";
import { LicensingAdminController } from "./licensing-admin.controller";
import { LicensingCatalogController } from "./licensing-catalog.controller";
import { LicensingCatalogService } from "./licensing-catalog.service";
import { LicensingSeatService } from "./licensing-seat.service";
import { PromoCodeService } from "./promo-code.service";
import { PromoCodeAdminController } from "./promo-code-admin.controller";
import { ModuleCatalogOverrideRepository } from "./repositories/module-catalog-override.repository";
import { MongoModuleCatalogOverrideRepository } from "./repositories/module-catalog-override.repository.mongo";
import { ModuleLicenseRepository } from "./repositories/module-license.repository";
import { MongoModuleLicenseRepository } from "./repositories/module-license.repository.mongo";
import { PromoCodeRepository } from "./repositories/promo-code.repository";
import { MongoPromoCodeRepository } from "./repositories/promo-code.repository.mongo";
import { PromoCodeRedemptionRepository } from "./repositories/promo-code-redemption.repository";
import { MongoPromoCodeRedemptionRepository } from "./repositories/promo-code-redemption.repository.mongo";
import { TierInviteRepository } from "./repositories/tier-invite.repository";
import { MongoTierInviteRepository } from "./repositories/tier-invite.repository.mongo";
import { ModuleCatalogOverrideSchema } from "./schemas/module-catalog-override.schema";
import { ModuleLicenseSchema } from "./schemas/module-license.schema";
import { PromoCodeSchema } from "./schemas/promo-code.schema";
import { PromoCodeRedemptionSchema } from "./schemas/promo-code-redemption.schema";
import { TierInviteSchema } from "./schemas/tier-invite.schema";
import { TenancyService } from "./tenancy.service";
import { TenancyAdminController } from "./tenancy-admin.controller";
import { TierInviteService } from "./tier-invite.service";
import { TierInviteAdminController } from "./tier-invite-admin.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "ModuleLicense", schema: ModuleLicenseSchema },
      { name: "ModuleCatalogOverride", schema: ModuleCatalogOverrideSchema },
      { name: "PromoCode", schema: PromoCodeSchema },
      { name: "PromoCodeRedemption", schema: PromoCodeRedemptionSchema },
      { name: "TierInvite", schema: TierInviteSchema },
      { name: "Company", schema: CompanySchema },
      { name: "User", schema: UserSchema },
    ]),
    FeatureFlagsModule,
    AdminModule,
    RbacModule,
    EmailModule,
  ],
  controllers: [
    LicensingCatalogController,
    LicensingAdminController,
    PromoCodeAdminController,
    TenancyAdminController,
    TierInviteAdminController,
  ],
  providers: [
    FeatureRegistry,
    DefaultAppLicensingRegistrar,
    LicensingService,
    LicensingCatalogService,
    LicensingSeatService,
    PromoCodeService,
    TenancyService,
    TierInviteService,
    FeatureLicenseGuard,
    repositoryProvider(TierInviteRepository, MongoTierInviteRepository),
    repositoryProvider(ModuleLicenseRepository, MongoModuleLicenseRepository),
    repositoryProvider(ModuleCatalogOverrideRepository, MongoModuleCatalogOverrideRepository),
    repositoryProvider(PromoCodeRepository, MongoPromoCodeRepository),
    repositoryProvider(PromoCodeRedemptionRepository, MongoPromoCodeRedemptionRepository),
    repositoryProvider(CompanyRepository, MongoCompanyRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
  ],
  exports: [
    FeatureRegistry,
    LicensingService,
    LicensingCatalogService,
    LicensingSeatService,
    PromoCodeService,
    TenancyService,
    FeatureLicenseGuard,
  ],
})
export class LicensingModule {}
