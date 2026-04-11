import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { NixModule } from "../nix/nix.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { StorageModule } from "../storage/storage.module";
import { FifoBatchController } from "./controllers/fifo-batch.controller";
import { IssuableProductController } from "./controllers/issuable-product.controller";
import { ProductCategoryController } from "./controllers/product-category.controller";
import { ProductDatasheetController } from "./controllers/product-datasheet.controller";
import { RubberCompoundController } from "./controllers/rubber-compound.controller";
import { StockManagementLicenseController } from "./controllers/stock-management-license.controller";
import { CompanyModuleLicense } from "./entities/company-module-license.entity";
import { ConsumableProduct } from "./entities/consumable-product.entity";
import { IssuableProduct } from "./entities/issuable-product.entity";
import { PaintProduct } from "./entities/paint-product.entity";
import { ProductCategory } from "./entities/product-category.entity";
import { ProductDatasheet } from "./entities/product-datasheet.entity";
import { RubberCompound } from "./entities/rubber-compound.entity";
import { RubberOffcutStock } from "./entities/rubber-offcut-stock.entity";
import { RubberRoll } from "./entities/rubber-roll.entity";
import { SolutionProduct } from "./entities/solution-product.entity";
import { StockMovementBatchConsumption } from "./entities/stock-movement-batch-consumption.entity";
import { StockPurchaseBatch } from "./entities/stock-purchase-batch.entity";
import { StockManagementFeatureGuard } from "./guards/stock-management-feature.guard";
import { DatasheetExtractionService } from "./services/datasheet-extraction.service";
import { FifoBatchService } from "./services/fifo-batch.service";
import { FifoBootstrapService } from "./services/fifo-bootstrap.service";
import { IssuableProductService } from "./services/issuable-product.service";
import { PaintClassificationService } from "./services/paint-classification.service";
import { ProductCategoryService } from "./services/product-category.service";
import { ProductDatasheetService } from "./services/product-datasheet.service";
import { RubberCompoundService } from "./services/rubber-compound.service";
import { StockManagementLicenseService } from "./services/stock-management-license.service";

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
  ],
})
export class StockManagementModule {}
