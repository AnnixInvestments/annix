import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { CompanyRepository } from "../platform/company.repository";
import { MongoCompanyRepository } from "../platform/company.repository.mongo";
import { PostgresCompanyRepository } from "../platform/company.repository.postgres";
import { Company } from "../platform/entities/company.entity";
import { CompanySchema } from "../platform/schemas/company.schema";
import { RbacModule } from "../rbac/rbac.module";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
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
import { LicensingSeatService } from "./licensing-seat.service";
import { PromoCodeService } from "./promo-code.service";
import { PromoCodeAdminController } from "./promo-code-admin.controller";
import { ModuleCatalogOverrideRepository } from "./repositories/module-catalog-override.repository";
import { MongoModuleCatalogOverrideRepository } from "./repositories/module-catalog-override.repository.mongo";
import { PostgresModuleCatalogOverrideRepository } from "./repositories/module-catalog-override.repository.postgres";
import { ModuleLicenseRepository } from "./repositories/module-license.repository";
import { MongoModuleLicenseRepository } from "./repositories/module-license.repository.mongo";
import { PostgresModuleLicenseRepository } from "./repositories/module-license.repository.postgres";
import { PromoCodeRepository } from "./repositories/promo-code.repository";
import { MongoPromoCodeRepository } from "./repositories/promo-code.repository.mongo";
import { PostgresPromoCodeRepository } from "./repositories/promo-code.repository.postgres";
import { PromoCodeRedemptionRepository } from "./repositories/promo-code-redemption.repository";
import { MongoPromoCodeRedemptionRepository } from "./repositories/promo-code-redemption.repository.mongo";
import { PostgresPromoCodeRedemptionRepository } from "./repositories/promo-code-redemption.repository.postgres";
import { ModuleCatalogOverrideSchema } from "./schemas/module-catalog-override.schema";
import { ModuleLicenseSchema } from "./schemas/module-license.schema";
import { PromoCodeSchema } from "./schemas/promo-code.schema";
import { PromoCodeRedemptionSchema } from "./schemas/promo-code-redemption.schema";
import { TenancyService } from "./tenancy.service";
import { TenancyAdminController } from "./tenancy-admin.controller";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "ModuleLicense", schema: ModuleLicenseSchema },
            { name: "ModuleCatalogOverride", schema: ModuleCatalogOverrideSchema },
            { name: "PromoCode", schema: PromoCodeSchema },
            { name: "PromoCodeRedemption", schema: PromoCodeRedemptionSchema },
            { name: "Company", schema: CompanySchema },
            { name: "User", schema: UserSchema },
          ]),
        ]
      : [
          TypeOrmModule.forFeature([
            ModuleLicense,
            ModuleCatalogOverride,
            PromoCode,
            PromoCodeRedemption,
            Company,
            User,
          ]),
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
    LicensingSeatService,
    PromoCodeService,
    TenancyService,
    FeatureLicenseGuard,
    repositoryProvider(
      ModuleLicenseRepository,
      PostgresModuleLicenseRepository,
      MongoModuleLicenseRepository,
    ),
    repositoryProvider(
      ModuleCatalogOverrideRepository,
      PostgresModuleCatalogOverrideRepository,
      MongoModuleCatalogOverrideRepository,
    ),
    repositoryProvider(PromoCodeRepository, PostgresPromoCodeRepository, MongoPromoCodeRepository),
    repositoryProvider(
      PromoCodeRedemptionRepository,
      PostgresPromoCodeRedemptionRepository,
      MongoPromoCodeRedemptionRepository,
    ),
    repositoryProvider(CompanyRepository, PostgresCompanyRepository, MongoCompanyRepository),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
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
