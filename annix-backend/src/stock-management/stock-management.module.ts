import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { NixModule } from "../nix/nix.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { StorageModule } from "../storage/storage.module";
import { FifoBatchController } from "./controllers/fifo-batch.controller";
import { IssuableProductController } from "./controllers/issuable-product.controller";
import { IssuanceController } from "./controllers/issuance.controller";
import { LocationMigrationController } from "./controllers/location-migration.controller";
import { PhotoIdentificationController } from "./controllers/photo-identification.controller";
import { ProductCategoryController } from "./controllers/product-category.controller";
import { ProductDatasheetController } from "./controllers/product-datasheet.controller";
import { ReturnsController } from "./controllers/returns.controller";
import { RubberCompoundController } from "./controllers/rubber-compound.controller";
import { StockHoldController } from "./controllers/stock-hold.controller";
import { StockManagementLicenseController } from "./controllers/stock-management-license.controller";
import { StockTakeController } from "./controllers/stock-take.controller";
import { VarianceCategoryController } from "./controllers/variance-category.controller";
import { CompanyModuleLicense } from "./entities/company-module-license.entity";
import { ConsumableIssuanceRow } from "./entities/consumable-issuance-row.entity";
import { ConsumableProduct } from "./entities/consumable-product.entity";
import { IssuableProduct } from "./entities/issuable-product.entity";
import { IssuanceRow } from "./entities/issuance-row.entity";
import { IssuanceSession } from "./entities/issuance-session.entity";
import { PaintIssuanceRow } from "./entities/paint-issuance-row.entity";
import { PaintProduct } from "./entities/paint-product.entity";
import { ProductCategory } from "./entities/product-category.entity";
import { ProductDatasheet } from "./entities/product-datasheet.entity";
import { ReturnSession } from "./entities/return-session.entity";
import { RubberCompound } from "./entities/rubber-compound.entity";
import { RubberOffcutReturn } from "./entities/rubber-offcut-return.entity";
import { RubberOffcutStock } from "./entities/rubber-offcut-stock.entity";
import { RubberRoll } from "./entities/rubber-roll.entity";
import { RubberRollIssuanceRow } from "./entities/rubber-roll-issuance-row.entity";
import { RubberWastageBin } from "./entities/rubber-wastage-bin.entity";
import { RubberWastageEntry } from "./entities/rubber-wastage-entry.entity";
import { SolutionIssuanceRow } from "./entities/solution-issuance-row.entity";
import { SolutionProduct } from "./entities/solution-product.entity";
import { StockHoldItem } from "./entities/stock-hold-item.entity";
import { StockMovementBatchConsumption } from "./entities/stock-movement-batch-consumption.entity";
import { StockPurchaseBatch } from "./entities/stock-purchase-batch.entity";
import { StockTake } from "./entities/stock-take.entity";
import { StockTakeAdjustment } from "./entities/stock-take-adjustment.entity";
import { StockTakeLine } from "./entities/stock-take-line.entity";
import { StockTakeVarianceCategory } from "./entities/stock-take-variance-category.entity";
import { StockManagementFeatureGuard } from "./guards/stock-management-feature.guard";
import { DatasheetExtractionService } from "./services/datasheet-extraction.service";
import { FifoBatchService } from "./services/fifo-batch.service";
import { FifoBootstrapService } from "./services/fifo-bootstrap.service";
import { IssuableProductService } from "./services/issuable-product.service";
import { IssuanceService } from "./services/issuance.service";
import { LocationClassificationService } from "./services/location-classification.service";
import { PaintClassificationService } from "./services/paint-classification.service";
import { PhotoIdentificationService } from "./services/photo-identification.service";
import { ProductCategoryService } from "./services/product-category.service";
import { ProductDatasheetService } from "./services/product-datasheet.service";
import { ReturnsService } from "./services/returns.service";
import { RubberCompoundService } from "./services/rubber-compound.service";
import { StockHoldService } from "./services/stock-hold.service";
import { StockManagementLicenseService } from "./services/stock-management-license.service";
import { StockManagementNotificationsService } from "./services/stock-management-notifications.service";
import { StockTakeService } from "./services/stock-take.service";
import { StockTakeCronService } from "./services/stock-take-cron.service";
import { StockTakeExportService } from "./services/stock-take-export.service";
import { VarianceCategoryService } from "./services/variance-category.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyModuleLicense,
      ProductCategory,
      IssuableProduct,
      ConsumableProduct,
      PaintProduct,
      RubberRoll,
      RubberOffcutStock,
      SolutionProduct,
      StockPurchaseBatch,
      StockMovementBatchConsumption,
      RubberCompound,
      ProductDatasheet,
      IssuanceSession,
      IssuanceRow,
      ConsumableIssuanceRow,
      PaintIssuanceRow,
      RubberRollIssuanceRow,
      SolutionIssuanceRow,
      ReturnSession,
      RubberOffcutReturn,
      RubberWastageBin,
      RubberWastageEntry,
      StockTake,
      StockTakeLine,
      StockTakeAdjustment,
      StockTakeVarianceCategory,
      StockHoldItem,
    ]),
    AuthModule,
    FeatureFlagsModule,
    StorageModule,
    NotificationsModule,
    NixModule,
  ],
  controllers: [
    StockManagementLicenseController,
    ProductCategoryController,
    IssuableProductController,
    FifoBatchController,
    RubberCompoundController,
    ProductDatasheetController,
    IssuanceController,
    ReturnsController,
    StockTakeController,
    LocationMigrationController,
    StockHoldController,
    VarianceCategoryController,
    PhotoIdentificationController,
  ],
  providers: [
    StockManagementLicenseService,
    StockManagementFeatureGuard,
    ProductCategoryService,
    IssuableProductService,
    PaintClassificationService,
    FifoBatchService,
    FifoBootstrapService,
    RubberCompoundService,
    ProductDatasheetService,
    DatasheetExtractionService,
    IssuanceService,
    ReturnsService,
    StockTakeService,
    StockTakeCronService,
    StockTakeExportService,
    LocationClassificationService,
    StockHoldService,
    VarianceCategoryService,
    StockManagementNotificationsService,
    PhotoIdentificationService,
  ],
  exports: [
    StockManagementLicenseService,
    StockManagementFeatureGuard,
    ProductCategoryService,
    IssuableProductService,
    PaintClassificationService,
    FifoBatchService,
    FifoBootstrapService,
    RubberCompoundService,
    ProductDatasheetService,
    DatasheetExtractionService,
    IssuanceService,
    ReturnsService,
    StockTakeService,
    StockTakeExportService,
    LocationClassificationService,
    StockHoldService,
    VarianceCategoryService,
    StockManagementNotificationsService,
    PhotoIdentificationService,
  ],
})
export class StockManagementModule {}
