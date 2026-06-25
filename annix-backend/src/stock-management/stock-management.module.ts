import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { TransactionModule } from "../lib/persistence/transaction.module";
import { NixModule } from "../nix/nix.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { StockControlAuthGuard } from "../stock-control/guards/stock-control-auth.guard";
import { StockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.mongo";
import { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.mongo";
import { StockItemRepository } from "../stock-control/repositories/stock-item.repository";
import { MongoStockItemRepository } from "../stock-control/repositories/stock-item.repository.mongo";
import { StockControlProfileSchema } from "../stock-control/schemas/stock-control-profile.schema";
import { StockControlUserSchema } from "../stock-control/schemas/stock-control-user.schema";
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
import { StockManagementFeatureGuard } from "./guards/stock-management-feature.guard";
import { CompanyModuleLicenseRepository } from "./repositories/company-module-license.repository";
import { MongoCompanyModuleLicenseRepository } from "./repositories/company-module-license.repository.mongo";
import { ConsumableIssuanceRowRepository } from "./repositories/consumable-issuance-row.repository";
import { MongoConsumableIssuanceRowRepository } from "./repositories/consumable-issuance-row.repository.mongo";
import { ConsumableProductRepository } from "./repositories/consumable-product.repository";
import { MongoConsumableProductRepository } from "./repositories/consumable-product.repository.mongo";
import { ConsumableReturnRepository } from "./repositories/consumable-return.repository";
import { MongoConsumableReturnRepository } from "./repositories/consumable-return.repository.mongo";
import { IssuableProductRepository } from "./repositories/issuable-product.repository";
import { MongoIssuableProductRepository } from "./repositories/issuable-product.repository.mongo";
import { IssuanceItemCoatTrackingRepository } from "./repositories/issuance-item-coat-tracking.repository";
import { MongoIssuanceItemCoatTrackingRepository } from "./repositories/issuance-item-coat-tracking.repository.mongo";
import { IssuanceRowRepository } from "./repositories/issuance-row.repository";
import { MongoIssuanceRowRepository } from "./repositories/issuance-row.repository.mongo";
import { IssuanceSessionRepository } from "./repositories/issuance-session.repository";
import { MongoIssuanceSessionRepository } from "./repositories/issuance-session.repository.mongo";
import { PaintIssuanceRowRepository } from "./repositories/paint-issuance-row.repository";
import { MongoPaintIssuanceRowRepository } from "./repositories/paint-issuance-row.repository.mongo";
import { PaintProductRepository } from "./repositories/paint-product.repository";
import { MongoPaintProductRepository } from "./repositories/paint-product.repository.mongo";
import { PaintReturnRepository } from "./repositories/paint-return.repository";
import { MongoPaintReturnRepository } from "./repositories/paint-return.repository.mongo";
import { ProductCategoryRepository } from "./repositories/product-category.repository";
import { MongoProductCategoryRepository } from "./repositories/product-category.repository.mongo";
import { ProductDatasheetRepository } from "./repositories/product-datasheet.repository";
import { MongoProductDatasheetRepository } from "./repositories/product-datasheet.repository.mongo";
import { ReturnSessionRepository } from "./repositories/return-session.repository";
import { MongoReturnSessionRepository } from "./repositories/return-session.repository.mongo";
import { RubberCompoundRepository } from "./repositories/rubber-compound.repository";
import { MongoRubberCompoundRepository } from "./repositories/rubber-compound.repository.mongo";
import { RubberOffcutReturnRepository } from "./repositories/rubber-offcut-return.repository";
import { MongoRubberOffcutReturnRepository } from "./repositories/rubber-offcut-return.repository.mongo";
import { RubberOffcutStockRepository } from "./repositories/rubber-offcut-stock.repository";
import { MongoRubberOffcutStockRepository } from "./repositories/rubber-offcut-stock.repository.mongo";
import { RubberRollRepository } from "./repositories/rubber-roll.repository";
import { MongoRubberRollRepository } from "./repositories/rubber-roll.repository.mongo";
import { RubberRollIssuanceRowRepository } from "./repositories/rubber-roll-issuance-row.repository";
import { MongoRubberRollIssuanceRowRepository } from "./repositories/rubber-roll-issuance-row.repository.mongo";
import { RubberWastageBinRepository } from "./repositories/rubber-wastage-bin.repository";
import { MongoRubberWastageBinRepository } from "./repositories/rubber-wastage-bin.repository.mongo";
import { RubberWastageEntryRepository } from "./repositories/rubber-wastage-entry.repository";
import { MongoRubberWastageEntryRepository } from "./repositories/rubber-wastage-entry.repository.mongo";
import { SolutionIssuanceRowRepository } from "./repositories/solution-issuance-row.repository";
import { MongoSolutionIssuanceRowRepository } from "./repositories/solution-issuance-row.repository.mongo";
import { SolutionProductRepository } from "./repositories/solution-product.repository";
import { MongoSolutionProductRepository } from "./repositories/solution-product.repository.mongo";
import { StockHoldItemRepository } from "./repositories/stock-hold-item.repository";
import { MongoStockHoldItemRepository } from "./repositories/stock-hold-item.repository.mongo";
import { StockMovementBatchConsumptionRepository } from "./repositories/stock-movement-batch-consumption.repository";
import { MongoStockMovementBatchConsumptionRepository } from "./repositories/stock-movement-batch-consumption.repository.mongo";
import { StockPurchaseBatchRepository } from "./repositories/stock-purchase-batch.repository";
import { MongoStockPurchaseBatchRepository } from "./repositories/stock-purchase-batch.repository.mongo";
import { StockTakeRepository } from "./repositories/stock-take.repository";
import { MongoStockTakeRepository } from "./repositories/stock-take.repository.mongo";
import { StockTakeAdjustmentRepository } from "./repositories/stock-take-adjustment.repository";
import { MongoStockTakeAdjustmentRepository } from "./repositories/stock-take-adjustment.repository.mongo";
import { StockTakeLineRepository } from "./repositories/stock-take-line.repository";
import { MongoStockTakeLineRepository } from "./repositories/stock-take-line.repository.mongo";
import { StockTakeVarianceCategoryRepository } from "./repositories/stock-take-variance-category.repository";
import { MongoStockTakeVarianceCategoryRepository } from "./repositories/stock-take-variance-category.repository.mongo";
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

const mongooseFeatures = [
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
    { name: "SmIssuanceSession", schema: IssuanceSessionSchema },
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
    { name: "StockControlUser", schema: StockControlUserSchema },
  ]),
];

@Module({
  imports: [
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
    repositoryProvider(CompanyModuleLicenseRepository, MongoCompanyModuleLicenseRepository),
    repositoryProvider(ProductCategoryRepository, MongoProductCategoryRepository),
    repositoryProvider(IssuableProductRepository, MongoIssuableProductRepository),
    repositoryProvider(ConsumableProductRepository, MongoConsumableProductRepository),
    repositoryProvider(PaintProductRepository, MongoPaintProductRepository),
    repositoryProvider(RubberRollRepository, MongoRubberRollRepository),
    repositoryProvider(RubberOffcutStockRepository, MongoRubberOffcutStockRepository),
    repositoryProvider(SolutionProductRepository, MongoSolutionProductRepository),
    repositoryProvider(StockPurchaseBatchRepository, MongoStockPurchaseBatchRepository),
    repositoryProvider(
      StockMovementBatchConsumptionRepository,
      MongoStockMovementBatchConsumptionRepository,
    ),
    repositoryProvider(RubberCompoundRepository, MongoRubberCompoundRepository),
    repositoryProvider(ProductDatasheetRepository, MongoProductDatasheetRepository),
    repositoryProvider(IssuanceSessionRepository, MongoIssuanceSessionRepository),
    repositoryProvider(IssuanceRowRepository, MongoIssuanceRowRepository),
    repositoryProvider(IssuanceItemCoatTrackingRepository, MongoIssuanceItemCoatTrackingRepository),
    repositoryProvider(ConsumableIssuanceRowRepository, MongoConsumableIssuanceRowRepository),
    repositoryProvider(PaintIssuanceRowRepository, MongoPaintIssuanceRowRepository),
    repositoryProvider(RubberRollIssuanceRowRepository, MongoRubberRollIssuanceRowRepository),
    repositoryProvider(SolutionIssuanceRowRepository, MongoSolutionIssuanceRowRepository),
    repositoryProvider(ReturnSessionRepository, MongoReturnSessionRepository),
    repositoryProvider(PaintReturnRepository, MongoPaintReturnRepository),
    repositoryProvider(ConsumableReturnRepository, MongoConsumableReturnRepository),
    repositoryProvider(RubberOffcutReturnRepository, MongoRubberOffcutReturnRepository),
    repositoryProvider(RubberWastageBinRepository, MongoRubberWastageBinRepository),
    repositoryProvider(RubberWastageEntryRepository, MongoRubberWastageEntryRepository),
    repositoryProvider(StockTakeRepository, MongoStockTakeRepository),
    repositoryProvider(StockTakeLineRepository, MongoStockTakeLineRepository),
    repositoryProvider(StockTakeAdjustmentRepository, MongoStockTakeAdjustmentRepository),
    repositoryProvider(
      StockTakeVarianceCategoryRepository,
      MongoStockTakeVarianceCategoryRepository,
    ),
    repositoryProvider(StockHoldItemRepository, MongoStockHoldItemRepository),
    repositoryProvider(StockItemRepository, MongoStockItemRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
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
