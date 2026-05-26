import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { TransactionModule } from "../lib/persistence/transaction.module";
import { NixModule } from "../nix/nix.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { Company } from "../platform/entities/company.entity";
import { StockControlProfile } from "../stock-control/entities/stock-control-profile.entity";
import { StockControlUser } from "../stock-control/entities/stock-control-user.entity";
import { StockItem } from "../stock-control/entities/stock-item.entity";
import { StockControlAuthGuard } from "../stock-control/guards/stock-control-auth.guard";
import { StockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.mongo";
import { PostgresStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.postgres";
import { StockItemRepository } from "../stock-control/repositories/stock-item.repository";
import { MongoStockItemRepository } from "../stock-control/repositories/stock-item.repository.mongo";
import { PostgresStockItemRepository } from "../stock-control/repositories/stock-item.repository.postgres";
import { StockControlProfileSchema } from "../stock-control/schemas/stock-control-profile.schema";
import { StockItemSchema } from "../stock-control/schemas/stock-item.schema";
import { StorageModule } from "../storage/storage.module";
import { DemoSeedController } from "./controllers/demo-seed.controller";
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
import { ConsumableReturn } from "./entities/consumable-return.entity";
import { IssuableProduct } from "./entities/issuable-product.entity";
import { IssuanceItemCoatTracking } from "./entities/issuance-item-coat-tracking.entity";
import { IssuanceRow } from "./entities/issuance-row.entity";
import { IssuanceSession } from "./entities/issuance-session.entity";
import { PaintIssuanceRow } from "./entities/paint-issuance-row.entity";
import { PaintProduct } from "./entities/paint-product.entity";
import { PaintReturn } from "./entities/paint-return.entity";
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
import { CompanyModuleLicenseRepository } from "./repositories/company-module-license.repository";
import { MongoCompanyModuleLicenseRepository } from "./repositories/company-module-license.repository.mongo";
import { PostgresCompanyModuleLicenseRepository } from "./repositories/company-module-license.repository.postgres";
import { ConsumableIssuanceRowRepository } from "./repositories/consumable-issuance-row.repository";
import { MongoConsumableIssuanceRowRepository } from "./repositories/consumable-issuance-row.repository.mongo";
import { PostgresConsumableIssuanceRowRepository } from "./repositories/consumable-issuance-row.repository.postgres";
import { ConsumableProductRepository } from "./repositories/consumable-product.repository";
import { MongoConsumableProductRepository } from "./repositories/consumable-product.repository.mongo";
import { PostgresConsumableProductRepository } from "./repositories/consumable-product.repository.postgres";
import { ConsumableReturnRepository } from "./repositories/consumable-return.repository";
import { MongoConsumableReturnRepository } from "./repositories/consumable-return.repository.mongo";
import { PostgresConsumableReturnRepository } from "./repositories/consumable-return.repository.postgres";
import { IssuableProductRepository } from "./repositories/issuable-product.repository";
import { MongoIssuableProductRepository } from "./repositories/issuable-product.repository.mongo";
import { PostgresIssuableProductRepository } from "./repositories/issuable-product.repository.postgres";
import { IssuanceItemCoatTrackingRepository } from "./repositories/issuance-item-coat-tracking.repository";
import { MongoIssuanceItemCoatTrackingRepository } from "./repositories/issuance-item-coat-tracking.repository.mongo";
import { PostgresIssuanceItemCoatTrackingRepository } from "./repositories/issuance-item-coat-tracking.repository.postgres";
import { IssuanceRowRepository } from "./repositories/issuance-row.repository";
import { MongoIssuanceRowRepository } from "./repositories/issuance-row.repository.mongo";
import { PostgresIssuanceRowRepository } from "./repositories/issuance-row.repository.postgres";
import { IssuanceSessionRepository } from "./repositories/issuance-session.repository";
import { MongoIssuanceSessionRepository } from "./repositories/issuance-session.repository.mongo";
import { PostgresIssuanceSessionRepository } from "./repositories/issuance-session.repository.postgres";
import { PaintIssuanceRowRepository } from "./repositories/paint-issuance-row.repository";
import { MongoPaintIssuanceRowRepository } from "./repositories/paint-issuance-row.repository.mongo";
import { PostgresPaintIssuanceRowRepository } from "./repositories/paint-issuance-row.repository.postgres";
import { PaintProductRepository } from "./repositories/paint-product.repository";
import { MongoPaintProductRepository } from "./repositories/paint-product.repository.mongo";
import { PostgresPaintProductRepository } from "./repositories/paint-product.repository.postgres";
import { PaintReturnRepository } from "./repositories/paint-return.repository";
import { MongoPaintReturnRepository } from "./repositories/paint-return.repository.mongo";
import { PostgresPaintReturnRepository } from "./repositories/paint-return.repository.postgres";
import { ProductCategoryRepository } from "./repositories/product-category.repository";
import { MongoProductCategoryRepository } from "./repositories/product-category.repository.mongo";
import { PostgresProductCategoryRepository } from "./repositories/product-category.repository.postgres";
import { ProductDatasheetRepository } from "./repositories/product-datasheet.repository";
import { MongoProductDatasheetRepository } from "./repositories/product-datasheet.repository.mongo";
import { PostgresProductDatasheetRepository } from "./repositories/product-datasheet.repository.postgres";
import { ReturnSessionRepository } from "./repositories/return-session.repository";
import { MongoReturnSessionRepository } from "./repositories/return-session.repository.mongo";
import { PostgresReturnSessionRepository } from "./repositories/return-session.repository.postgres";
import { RubberCompoundRepository } from "./repositories/rubber-compound.repository";
import { MongoRubberCompoundRepository } from "./repositories/rubber-compound.repository.mongo";
import { PostgresRubberCompoundRepository } from "./repositories/rubber-compound.repository.postgres";
import { RubberOffcutReturnRepository } from "./repositories/rubber-offcut-return.repository";
import { MongoRubberOffcutReturnRepository } from "./repositories/rubber-offcut-return.repository.mongo";
import { PostgresRubberOffcutReturnRepository } from "./repositories/rubber-offcut-return.repository.postgres";
import { RubberOffcutStockRepository } from "./repositories/rubber-offcut-stock.repository";
import { MongoRubberOffcutStockRepository } from "./repositories/rubber-offcut-stock.repository.mongo";
import { PostgresRubberOffcutStockRepository } from "./repositories/rubber-offcut-stock.repository.postgres";
import { RubberRollRepository } from "./repositories/rubber-roll.repository";
import { MongoRubberRollRepository } from "./repositories/rubber-roll.repository.mongo";
import { PostgresRubberRollRepository } from "./repositories/rubber-roll.repository.postgres";
import { RubberRollIssuanceRowRepository } from "./repositories/rubber-roll-issuance-row.repository";
import { MongoRubberRollIssuanceRowRepository } from "./repositories/rubber-roll-issuance-row.repository.mongo";
import { PostgresRubberRollIssuanceRowRepository } from "./repositories/rubber-roll-issuance-row.repository.postgres";
import { RubberWastageBinRepository } from "./repositories/rubber-wastage-bin.repository";
import { MongoRubberWastageBinRepository } from "./repositories/rubber-wastage-bin.repository.mongo";
import { PostgresRubberWastageBinRepository } from "./repositories/rubber-wastage-bin.repository.postgres";
import { RubberWastageEntryRepository } from "./repositories/rubber-wastage-entry.repository";
import { MongoRubberWastageEntryRepository } from "./repositories/rubber-wastage-entry.repository.mongo";
import { PostgresRubberWastageEntryRepository } from "./repositories/rubber-wastage-entry.repository.postgres";
import { SolutionIssuanceRowRepository } from "./repositories/solution-issuance-row.repository";
import { MongoSolutionIssuanceRowRepository } from "./repositories/solution-issuance-row.repository.mongo";
import { PostgresSolutionIssuanceRowRepository } from "./repositories/solution-issuance-row.repository.postgres";
import { SolutionProductRepository } from "./repositories/solution-product.repository";
import { MongoSolutionProductRepository } from "./repositories/solution-product.repository.mongo";
import { PostgresSolutionProductRepository } from "./repositories/solution-product.repository.postgres";
import { StockHoldItemRepository } from "./repositories/stock-hold-item.repository";
import { MongoStockHoldItemRepository } from "./repositories/stock-hold-item.repository.mongo";
import { PostgresStockHoldItemRepository } from "./repositories/stock-hold-item.repository.postgres";
import { StockMovementBatchConsumptionRepository } from "./repositories/stock-movement-batch-consumption.repository";
import { MongoStockMovementBatchConsumptionRepository } from "./repositories/stock-movement-batch-consumption.repository.mongo";
import { PostgresStockMovementBatchConsumptionRepository } from "./repositories/stock-movement-batch-consumption.repository.postgres";
import { StockPurchaseBatchRepository } from "./repositories/stock-purchase-batch.repository";
import { MongoStockPurchaseBatchRepository } from "./repositories/stock-purchase-batch.repository.mongo";
import { PostgresStockPurchaseBatchRepository } from "./repositories/stock-purchase-batch.repository.postgres";
import { StockTakeRepository } from "./repositories/stock-take.repository";
import { MongoStockTakeRepository } from "./repositories/stock-take.repository.mongo";
import { PostgresStockTakeRepository } from "./repositories/stock-take.repository.postgres";
import { StockTakeAdjustmentRepository } from "./repositories/stock-take-adjustment.repository";
import { MongoStockTakeAdjustmentRepository } from "./repositories/stock-take-adjustment.repository.mongo";
import { PostgresStockTakeAdjustmentRepository } from "./repositories/stock-take-adjustment.repository.postgres";
import { StockTakeLineRepository } from "./repositories/stock-take-line.repository";
import { MongoStockTakeLineRepository } from "./repositories/stock-take-line.repository.mongo";
import { PostgresStockTakeLineRepository } from "./repositories/stock-take-line.repository.postgres";
import { StockTakeVarianceCategoryRepository } from "./repositories/stock-take-variance-category.repository";
import { MongoStockTakeVarianceCategoryRepository } from "./repositories/stock-take-variance-category.repository.mongo";
import { PostgresStockTakeVarianceCategoryRepository } from "./repositories/stock-take-variance-category.repository.postgres";
import { CompanyModuleLicenseSchema } from "./schemas/company-module-license.schema";
import { ConsumableIssuanceRowSchema } from "./schemas/consumable-issuance-row.schema";
import { ConsumableProductSchema } from "./schemas/consumable-product.schema";
import { ConsumableReturnSchema } from "./schemas/consumable-return.schema";
import { IssuableProductSchema } from "./schemas/issuable-product.schema";
import { IssuanceItemCoatTrackingSchema } from "./schemas/issuance-item-coat-tracking.schema";
import { IssuanceRowSchema } from "./schemas/issuance-row.schema";
import { IssuanceSessionSchema } from "./schemas/issuance-session.schema";
import { PaintIssuanceRowSchema } from "./schemas/paint-issuance-row.schema";
import { PaintProductSchema } from "./schemas/paint-product.schema";
import { PaintReturnSchema } from "./schemas/paint-return.schema";
import { ProductCategorySchema } from "./schemas/product-category.schema";
import { ProductDatasheetSchema } from "./schemas/product-datasheet.schema";
import { ReturnSessionSchema } from "./schemas/return-session.schema";
import { RubberCompoundSchema } from "./schemas/rubber-compound.schema";
import { RubberOffcutReturnSchema } from "./schemas/rubber-offcut-return.schema";
import { RubberOffcutStockSchema } from "./schemas/rubber-offcut-stock.schema";
import { RubberRollSchema } from "./schemas/rubber-roll.schema";
import { RubberRollIssuanceRowSchema } from "./schemas/rubber-roll-issuance-row.schema";
import { RubberWastageBinSchema } from "./schemas/rubber-wastage-bin.schema";
import { RubberWastageEntrySchema } from "./schemas/rubber-wastage-entry.schema";
import { SolutionIssuanceRowSchema } from "./schemas/solution-issuance-row.schema";
import { SolutionProductSchema } from "./schemas/solution-product.schema";
import { StockHoldItemSchema } from "./schemas/stock-hold-item.schema";
import { StockMovementBatchConsumptionSchema } from "./schemas/stock-movement-batch-consumption.schema";
import { StockPurchaseBatchSchema } from "./schemas/stock-purchase-batch.schema";
import { StockTakeSchema } from "./schemas/stock-take.schema";
import { StockTakeAdjustmentSchema } from "./schemas/stock-take-adjustment.schema";
import { StockTakeLineSchema } from "./schemas/stock-take-line.schema";
import { StockTakeVarianceCategorySchema } from "./schemas/stock-take-variance-category.schema";
import { DatasheetExtractionService } from "./services/datasheet-extraction.service";
import { DemoSeedService } from "./services/demo-seed.service";
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
import { SupplierInvoiceFifoBridgeService } from "./services/supplier-invoice-fifo-bridge.service";
import { VarianceCategoryService } from "./services/variance-category.service";

const mongooseFeatures = isMongoDriver()
  ? [
      MongooseModule.forFeature([
        { name: "CompanyModuleLicense", schema: CompanyModuleLicenseSchema },
        { name: "ProductCategory", schema: ProductCategorySchema },
        { name: "IssuableProduct", schema: IssuableProductSchema },
        { name: "ConsumableProduct", schema: ConsumableProductSchema },
        { name: "PaintProduct", schema: PaintProductSchema },
        { name: "RubberRoll", schema: RubberRollSchema },
        { name: "RubberOffcutStock", schema: RubberOffcutStockSchema },
        { name: "SolutionProduct", schema: SolutionProductSchema },
        { name: "StockPurchaseBatch", schema: StockPurchaseBatchSchema },
        {
          name: "StockMovementBatchConsumption",
          schema: StockMovementBatchConsumptionSchema,
        },
        { name: "RubberCompound", schema: RubberCompoundSchema },
        { name: "ProductDatasheet", schema: ProductDatasheetSchema },
        { name: "IssuanceSession", schema: IssuanceSessionSchema },
        { name: "IssuanceRow", schema: IssuanceRowSchema },
        { name: "IssuanceItemCoatTracking", schema: IssuanceItemCoatTrackingSchema },
        { name: "ConsumableIssuanceRow", schema: ConsumableIssuanceRowSchema },
        { name: "PaintIssuanceRow", schema: PaintIssuanceRowSchema },
        { name: "RubberRollIssuanceRow", schema: RubberRollIssuanceRowSchema },
        { name: "SolutionIssuanceRow", schema: SolutionIssuanceRowSchema },
        { name: "ReturnSession", schema: ReturnSessionSchema },
        { name: "PaintReturn", schema: PaintReturnSchema },
        { name: "ConsumableReturn", schema: ConsumableReturnSchema },
        { name: "RubberOffcutReturn", schema: RubberOffcutReturnSchema },
        { name: "RubberWastageBin", schema: RubberWastageBinSchema },
        { name: "RubberWastageEntry", schema: RubberWastageEntrySchema },
        { name: "StockTake", schema: StockTakeSchema },
        { name: "StockTakeLine", schema: StockTakeLineSchema },
        { name: "StockTakeAdjustment", schema: StockTakeAdjustmentSchema },
        { name: "StockTakeVarianceCategory", schema: StockTakeVarianceCategorySchema },
        { name: "StockHoldItem", schema: StockHoldItemSchema },
        { name: "StockItem", schema: StockItemSchema },
        { name: "StockControlProfile", schema: StockControlProfileSchema },
      ]),
    ]
  : [];

@Module({
  imports: [
    ...(isMongoDriver()
      ? []
      : [
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
            IssuanceItemCoatTracking,
            ConsumableIssuanceRow,
            PaintIssuanceRow,
            RubberRollIssuanceRow,
            SolutionIssuanceRow,
            ReturnSession,
            PaintReturn,
            ConsumableReturn,
            RubberOffcutReturn,
            RubberWastageBin,
            RubberWastageEntry,
            StockTake,
            StockTakeLine,
            StockTakeAdjustment,
            StockTakeVarianceCategory,
            StockHoldItem,
            StockControlUser,
            StockControlProfile,
            Company,
            StockItem,
          ]),
        ]),
    ...mongooseFeatures,
    TransactionModule,
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
    DemoSeedController,
  ],
  providers: [
    StockControlAuthGuard,
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
    SupplierInvoiceFifoBridgeService,
    DemoSeedService,
    repositoryProvider(
      CompanyModuleLicenseRepository,
      PostgresCompanyModuleLicenseRepository,
      MongoCompanyModuleLicenseRepository,
    ),
    repositoryProvider(
      ProductCategoryRepository,
      PostgresProductCategoryRepository,
      MongoProductCategoryRepository,
    ),
    repositoryProvider(
      IssuableProductRepository,
      PostgresIssuableProductRepository,
      MongoIssuableProductRepository,
    ),
    repositoryProvider(
      ConsumableProductRepository,
      PostgresConsumableProductRepository,
      MongoConsumableProductRepository,
    ),
    repositoryProvider(
      PaintProductRepository,
      PostgresPaintProductRepository,
      MongoPaintProductRepository,
    ),
    repositoryProvider(
      RubberRollRepository,
      PostgresRubberRollRepository,
      MongoRubberRollRepository,
    ),
    repositoryProvider(
      RubberOffcutStockRepository,
      PostgresRubberOffcutStockRepository,
      MongoRubberOffcutStockRepository,
    ),
    repositoryProvider(
      SolutionProductRepository,
      PostgresSolutionProductRepository,
      MongoSolutionProductRepository,
    ),
    repositoryProvider(
      StockPurchaseBatchRepository,
      PostgresStockPurchaseBatchRepository,
      MongoStockPurchaseBatchRepository,
    ),
    repositoryProvider(
      StockMovementBatchConsumptionRepository,
      PostgresStockMovementBatchConsumptionRepository,
      MongoStockMovementBatchConsumptionRepository,
    ),
    repositoryProvider(
      RubberCompoundRepository,
      PostgresRubberCompoundRepository,
      MongoRubberCompoundRepository,
    ),
    repositoryProvider(
      ProductDatasheetRepository,
      PostgresProductDatasheetRepository,
      MongoProductDatasheetRepository,
    ),
    repositoryProvider(
      IssuanceSessionRepository,
      PostgresIssuanceSessionRepository,
      MongoIssuanceSessionRepository,
    ),
    repositoryProvider(
      IssuanceRowRepository,
      PostgresIssuanceRowRepository,
      MongoIssuanceRowRepository,
    ),
    repositoryProvider(
      IssuanceItemCoatTrackingRepository,
      PostgresIssuanceItemCoatTrackingRepository,
      MongoIssuanceItemCoatTrackingRepository,
    ),
    repositoryProvider(
      ConsumableIssuanceRowRepository,
      PostgresConsumableIssuanceRowRepository,
      MongoConsumableIssuanceRowRepository,
    ),
    repositoryProvider(
      PaintIssuanceRowRepository,
      PostgresPaintIssuanceRowRepository,
      MongoPaintIssuanceRowRepository,
    ),
    repositoryProvider(
      RubberRollIssuanceRowRepository,
      PostgresRubberRollIssuanceRowRepository,
      MongoRubberRollIssuanceRowRepository,
    ),
    repositoryProvider(
      SolutionIssuanceRowRepository,
      PostgresSolutionIssuanceRowRepository,
      MongoSolutionIssuanceRowRepository,
    ),
    repositoryProvider(
      ReturnSessionRepository,
      PostgresReturnSessionRepository,
      MongoReturnSessionRepository,
    ),
    repositoryProvider(
      PaintReturnRepository,
      PostgresPaintReturnRepository,
      MongoPaintReturnRepository,
    ),
    repositoryProvider(
      ConsumableReturnRepository,
      PostgresConsumableReturnRepository,
      MongoConsumableReturnRepository,
    ),
    repositoryProvider(
      RubberOffcutReturnRepository,
      PostgresRubberOffcutReturnRepository,
      MongoRubberOffcutReturnRepository,
    ),
    repositoryProvider(
      RubberWastageBinRepository,
      PostgresRubberWastageBinRepository,
      MongoRubberWastageBinRepository,
    ),
    repositoryProvider(
      RubberWastageEntryRepository,
      PostgresRubberWastageEntryRepository,
      MongoRubberWastageEntryRepository,
    ),
    repositoryProvider(StockTakeRepository, PostgresStockTakeRepository, MongoStockTakeRepository),
    repositoryProvider(
      StockTakeLineRepository,
      PostgresStockTakeLineRepository,
      MongoStockTakeLineRepository,
    ),
    repositoryProvider(
      StockTakeAdjustmentRepository,
      PostgresStockTakeAdjustmentRepository,
      MongoStockTakeAdjustmentRepository,
    ),
    repositoryProvider(
      StockTakeVarianceCategoryRepository,
      PostgresStockTakeVarianceCategoryRepository,
      MongoStockTakeVarianceCategoryRepository,
    ),
    repositoryProvider(
      StockHoldItemRepository,
      PostgresStockHoldItemRepository,
      MongoStockHoldItemRepository,
    ),
    repositoryProvider(StockItemRepository, PostgresStockItemRepository, MongoStockItemRepository),
    repositoryProvider(
      StockControlProfileRepository,
      PostgresStockControlProfileRepository,
      MongoStockControlProfileRepository,
    ),
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
    SupplierInvoiceFifoBridgeService,
  ],
})
export class StockManagementModule {}
