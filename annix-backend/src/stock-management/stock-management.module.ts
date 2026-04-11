import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { StorageModule } from "../storage/storage.module";
import { StockManagementLicenseController } from "./controllers/stock-management-license.controller";
import { CompanyModuleLicense } from "./entities/company-module-license.entity";
import { StockManagementFeatureGuard } from "./guards/stock-management-feature.guard";
import { StockManagementLicenseService } from "./services/stock-management-license.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyModuleLicense]),
    AuthModule,
    FeatureFlagsModule,
    StorageModule,
    NotificationsModule,
  ],
  controllers: [StockManagementLicenseController],
  providers: [StockManagementLicenseService, StockManagementFeatureGuard],
  exports: [StockManagementLicenseService, StockManagementFeatureGuard],
})
export class StockManagementModule {}
