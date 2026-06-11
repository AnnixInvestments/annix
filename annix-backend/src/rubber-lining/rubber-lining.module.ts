import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { LicensingModule } from "../licensing";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { App } from "../rbac/entities/app.entity";
import { AppPermission } from "../rbac/entities/app-permission.entity";
import { AppRole } from "../rbac/entities/app-role.entity";
import { AppRolePermission } from "../rbac/entities/app-role-permission.entity";
import { AppRoleProduct } from "../rbac/entities/app-role-product.entity";
import { UserAccessProduct } from "../rbac/entities/user-access-product.entity";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { UserAppPermission } from "../rbac/entities/user-app-permission.entity";
import { RbacModule } from "../rbac/rbac.module";
import { AppRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import { MongoAppRepository, MongoUserAppAccessRepository } from "../rbac/rbac.repository.mongo";
import {
  PostgresAppRepository,
  PostgresUserAppAccessRepository,
} from "../rbac/rbac.repository.postgres";
import { AppSchema } from "../rbac/schemas/app.schema";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { SageExportModule } from "../sage-export/sage-export.module";
import { SharedModule } from "../shared/shared.module";
import { JobCard } from "../stock-control/entities/job-card.entity";
import { JobCardLineItem } from "../stock-control/entities/job-card-line-item.entity";
import { JobCardRepository } from "../stock-control/repositories/job-card.repository";
import { MongoJobCardRepository } from "../stock-control/repositories/job-card.repository.mongo";
import { PostgresJobCardRepository } from "../stock-control/repositories/job-card.repository.postgres";
import { JobCardLineItemRepository } from "../stock-control/repositories/job-card-line-item.repository";
import { MongoJobCardLineItemRepository } from "../stock-control/repositories/job-card-line-item.repository.mongo";
import { PostgresJobCardLineItemRepository } from "../stock-control/repositories/job-card-line-item.repository.postgres";
import { JobCardSchema } from "../stock-control/schemas/job-card.schema";
import { JobCardLineItemSchema } from "../stock-control/schemas/job-card-line-item.schema";
import { AuRubberLicensingRegistrar } from "./au-rubber-licensing.registrar";
import { BlogPostsController } from "./blog-posts.controller";
import { BlogPostsService } from "./blog-posts.service";
import { AuRubberCapabilities } from "./capabilities/au-rubber.capabilities";
import { BlogPost } from "./entities/blog-post.entity";
import { RubberAccountSignOff } from "./entities/rubber-account-sign-off.entity";
import { RubberAppProfile } from "./entities/rubber-app-profile.entity";
import {
  RubberAdhesionRequirement,
  RubberApplicationRating,
  RubberThicknessRecommendation,
} from "./entities/rubber-application.entity";
import { RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { RubberAuCocItem } from "./entities/rubber-au-coc-item.entity";
import { RubberChemicalCompatibility } from "./entities/rubber-chemical-compatibility.entity";
import { RubberCocBatchCorrection } from "./entities/rubber-coc-batch-correction.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberCompanyDirector } from "./entities/rubber-company-director.entity";
import { RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RubberCompoundMovement } from "./entities/rubber-compound-movement.entity";
import { RubberCompoundOrder } from "./entities/rubber-compound-order.entity";
import { RubberCompoundQualityConfig } from "./entities/rubber-compound-quality-config.entity";
import { RubberCompoundStock } from "./entities/rubber-compound-stock.entity";
import { RubberCostRate } from "./entities/rubber-cost-rate.entity";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import { RubberDeliveryNoteCorrection } from "./entities/rubber-delivery-note-correction.entity";
import { RubberDeliveryNoteItem } from "./entities/rubber-delivery-note-item.entity";
import { RubberMonthlyAccount } from "./entities/rubber-monthly-account.entity";
import { RubberOrder } from "./entities/rubber-order.entity";
import { RubberOrderImportCorrection } from "./entities/rubber-order-import-correction.entity";
import { RubberOrderItem } from "./entities/rubber-order-item.entity";
import { RubberOtherStock } from "./entities/rubber-other-stock.entity";
import { RubberPoExtractionRegion } from "./entities/rubber-po-extraction-region.entity";
import { RubberPoExtractionTemplate } from "./entities/rubber-po-extraction-template.entity";
import { RubberPricingTier } from "./entities/rubber-pricing-tier.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberProduction } from "./entities/rubber-production.entity";
import {
  RubberPurchaseRequisition,
  RubberPurchaseRequisitionItem,
} from "./entities/rubber-purchase-requisition.entity";
import { RubberQualityAlert } from "./entities/rubber-quality-alert.entity";
import {
  RubberRollIssuance,
  RubberRollIssuanceItem,
  RubberRollIssuanceLineItem,
} from "./entities/rubber-roll-issuance.entity";
import { RubberRollRejection } from "./entities/rubber-roll-rejection.entity";
import { RubberRollStock } from "./entities/rubber-roll-stock.entity";
import { RubberSpecification } from "./entities/rubber-specification.entity";
import { RubberStatementReconciliation } from "./entities/rubber-statement-reconciliation.entity";
import { RubberStockLocation } from "./entities/rubber-stock-location.entity";
import { RubberSupplierCoc } from "./entities/rubber-supplier-coc.entity";
import { RubberTaxInvoice } from "./entities/rubber-tax-invoice.entity";
import { RubberTaxInvoiceCorrection } from "./entities/rubber-tax-invoice-correction.entity";
import { RubberType } from "./entities/rubber-type.entity";
import { Testimonial } from "./entities/testimonial.entity";
import { WebsitePage } from "./entities/website-page.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import { AuRubberFeatureGuard } from "./guards/au-rubber-feature.guard";
import { PublicAuIndustriesController } from "./public-au-industries.controller";
import { BlogPostRepository } from "./repositories/blog-post.repository";
import { MongoBlogPostRepository } from "./repositories/blog-post.repository.mongo";
import { PostgresBlogPostRepository } from "./repositories/blog-post.repository.postgres";
import { RubberAccountSignOffRepository } from "./repositories/rubber-account-sign-off.repository";
import { MongoRubberAccountSignOffRepository } from "./repositories/rubber-account-sign-off.repository.mongo";
import { PostgresRubberAccountSignOffRepository } from "./repositories/rubber-account-sign-off.repository.postgres";
import { RubberAdhesionRequirementRepository } from "./repositories/rubber-adhesion-requirement.repository";
import { MongoRubberAdhesionRequirementRepository } from "./repositories/rubber-adhesion-requirement.repository.mongo";
import { PostgresRubberAdhesionRequirementRepository } from "./repositories/rubber-adhesion-requirement.repository.postgres";
import { RubberAppProfileRepository } from "./repositories/rubber-app-profile.repository";
import { MongoRubberAppProfileRepository } from "./repositories/rubber-app-profile.repository.mongo";
import { PostgresRubberAppProfileRepository } from "./repositories/rubber-app-profile.repository.postgres";
import { RubberApplicationRatingRepository } from "./repositories/rubber-application-rating.repository";
import { MongoRubberApplicationRatingRepository } from "./repositories/rubber-application-rating.repository.mongo";
import { PostgresRubberApplicationRatingRepository } from "./repositories/rubber-application-rating.repository.postgres";
import { RubberAuCocRepository } from "./repositories/rubber-au-coc.repository";
import { MongoRubberAuCocRepository } from "./repositories/rubber-au-coc.repository.mongo";
import { PostgresRubberAuCocRepository } from "./repositories/rubber-au-coc.repository.postgres";
import { RubberAuCocItemRepository } from "./repositories/rubber-au-coc-item.repository";
import { MongoRubberAuCocItemRepository } from "./repositories/rubber-au-coc-item.repository.mongo";
import { PostgresRubberAuCocItemRepository } from "./repositories/rubber-au-coc-item.repository.postgres";
import { RubberChemicalCompatibilityRepository } from "./repositories/rubber-chemical-compatibility.repository";
import { MongoRubberChemicalCompatibilityRepository } from "./repositories/rubber-chemical-compatibility.repository.mongo";
import { PostgresRubberChemicalCompatibilityRepository } from "./repositories/rubber-chemical-compatibility.repository.postgres";
import { RubberCocBatchCorrectionRepository } from "./repositories/rubber-coc-batch-correction.repository";
import { MongoRubberCocBatchCorrectionRepository } from "./repositories/rubber-coc-batch-correction.repository.mongo";
import { PostgresRubberCocBatchCorrectionRepository } from "./repositories/rubber-coc-batch-correction.repository.postgres";
import { RubberCompanyRepository } from "./repositories/rubber-company.repository";
import { MongoRubberCompanyRepository } from "./repositories/rubber-company.repository.mongo";
import { PostgresRubberCompanyRepository } from "./repositories/rubber-company.repository.postgres";
import { RubberCompanyDirectorRepository } from "./repositories/rubber-company-director.repository";
import { MongoRubberCompanyDirectorRepository } from "./repositories/rubber-company-director.repository.mongo";
import { PostgresRubberCompanyDirectorRepository } from "./repositories/rubber-company-director.repository.postgres";
import { RubberCompoundBatchRepository } from "./repositories/rubber-compound-batch.repository";
import { MongoRubberCompoundBatchRepository } from "./repositories/rubber-compound-batch.repository.mongo";
import { PostgresRubberCompoundBatchRepository } from "./repositories/rubber-compound-batch.repository.postgres";
import { RubberCompoundMovementRepository } from "./repositories/rubber-compound-movement.repository";
import { MongoRubberCompoundMovementRepository } from "./repositories/rubber-compound-movement.repository.mongo";
import { PostgresRubberCompoundMovementRepository } from "./repositories/rubber-compound-movement.repository.postgres";
import { RubberCompoundOrderRepository } from "./repositories/rubber-compound-order.repository";
import { MongoRubberCompoundOrderRepository } from "./repositories/rubber-compound-order.repository.mongo";
import { PostgresRubberCompoundOrderRepository } from "./repositories/rubber-compound-order.repository.postgres";
import { RubberCompoundQualityConfigRepository } from "./repositories/rubber-compound-quality-config.repository";
import { MongoRubberCompoundQualityConfigRepository } from "./repositories/rubber-compound-quality-config.repository.mongo";
import { PostgresRubberCompoundQualityConfigRepository } from "./repositories/rubber-compound-quality-config.repository.postgres";
import { RubberCompoundStockRepository } from "./repositories/rubber-compound-stock.repository";
import { MongoRubberCompoundStockRepository } from "./repositories/rubber-compound-stock.repository.mongo";
import { PostgresRubberCompoundStockRepository } from "./repositories/rubber-compound-stock.repository.postgres";
import { RubberCostRateRepository } from "./repositories/rubber-cost-rate.repository";
import { MongoRubberCostRateRepository } from "./repositories/rubber-cost-rate.repository.mongo";
import { PostgresRubberCostRateRepository } from "./repositories/rubber-cost-rate.repository.postgres";
import { RubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository";
import { MongoRubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository.mongo";
import { PostgresRubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository.postgres";
import { RubberDeliveryNoteCorrectionRepository } from "./repositories/rubber-delivery-note-correction.repository";
import { MongoRubberDeliveryNoteCorrectionRepository } from "./repositories/rubber-delivery-note-correction.repository.mongo";
import { PostgresRubberDeliveryNoteCorrectionRepository } from "./repositories/rubber-delivery-note-correction.repository.postgres";
import { RubberDeliveryNoteItemRepository } from "./repositories/rubber-delivery-note-item.repository";
import { MongoRubberDeliveryNoteItemRepository } from "./repositories/rubber-delivery-note-item.repository.mongo";
import { PostgresRubberDeliveryNoteItemRepository } from "./repositories/rubber-delivery-note-item.repository.postgres";
import { RubberMonthlyAccountRepository } from "./repositories/rubber-monthly-account.repository";
import { MongoRubberMonthlyAccountRepository } from "./repositories/rubber-monthly-account.repository.mongo";
import { PostgresRubberMonthlyAccountRepository } from "./repositories/rubber-monthly-account.repository.postgres";
import { RubberOrderRepository } from "./repositories/rubber-order.repository";
import { MongoRubberOrderRepository } from "./repositories/rubber-order.repository.mongo";
import { PostgresRubberOrderRepository } from "./repositories/rubber-order.repository.postgres";
import { RubberOrderImportCorrectionRepository } from "./repositories/rubber-order-import-correction.repository";
import { MongoRubberOrderImportCorrectionRepository } from "./repositories/rubber-order-import-correction.repository.mongo";
import { PostgresRubberOrderImportCorrectionRepository } from "./repositories/rubber-order-import-correction.repository.postgres";
import { RubberOrderItemRepository } from "./repositories/rubber-order-item.repository";
import { MongoRubberOrderItemRepository } from "./repositories/rubber-order-item.repository.mongo";
import { PostgresRubberOrderItemRepository } from "./repositories/rubber-order-item.repository.postgres";
import { RubberOtherStockRepository } from "./repositories/rubber-other-stock.repository";
import { MongoRubberOtherStockRepository } from "./repositories/rubber-other-stock.repository.mongo";
import { PostgresRubberOtherStockRepository } from "./repositories/rubber-other-stock.repository.postgres";
import { RubberPoExtractionRegionRepository } from "./repositories/rubber-po-extraction-region.repository";
import { MongoRubberPoExtractionRegionRepository } from "./repositories/rubber-po-extraction-region.repository.mongo";
import { PostgresRubberPoExtractionRegionRepository } from "./repositories/rubber-po-extraction-region.repository.postgres";
import { RubberPoExtractionTemplateRepository } from "./repositories/rubber-po-extraction-template.repository";
import { MongoRubberPoExtractionTemplateRepository } from "./repositories/rubber-po-extraction-template.repository.mongo";
import { PostgresRubberPoExtractionTemplateRepository } from "./repositories/rubber-po-extraction-template.repository.postgres";
import { RubberPricingTierRepository } from "./repositories/rubber-pricing-tier.repository";
import { MongoRubberPricingTierRepository } from "./repositories/rubber-pricing-tier.repository.mongo";
import { PostgresRubberPricingTierRepository } from "./repositories/rubber-pricing-tier.repository.postgres";
import { RubberProductRepository } from "./repositories/rubber-product.repository";
import { MongoRubberProductRepository } from "./repositories/rubber-product.repository.mongo";
import { PostgresRubberProductRepository } from "./repositories/rubber-product.repository.postgres";
import { RubberProductCodingRepository } from "./repositories/rubber-product-coding.repository";
import { MongoRubberProductCodingRepository } from "./repositories/rubber-product-coding.repository.mongo";
import { PostgresRubberProductCodingRepository } from "./repositories/rubber-product-coding.repository.postgres";
import { RubberProductionRepository } from "./repositories/rubber-production.repository";
import { MongoRubberProductionRepository } from "./repositories/rubber-production.repository.mongo";
import { PostgresRubberProductionRepository } from "./repositories/rubber-production.repository.postgres";
import { RubberPurchaseRequisitionRepository } from "./repositories/rubber-purchase-requisition.repository";
import { MongoRubberPurchaseRequisitionRepository } from "./repositories/rubber-purchase-requisition.repository.mongo";
import { PostgresRubberPurchaseRequisitionRepository } from "./repositories/rubber-purchase-requisition.repository.postgres";
import { RubberPurchaseRequisitionItemRepository } from "./repositories/rubber-purchase-requisition-item.repository";
import { MongoRubberPurchaseRequisitionItemRepository } from "./repositories/rubber-purchase-requisition-item.repository.mongo";
import { PostgresRubberPurchaseRequisitionItemRepository } from "./repositories/rubber-purchase-requisition-item.repository.postgres";
import { RubberQualityAlertRepository } from "./repositories/rubber-quality-alert.repository";
import { MongoRubberQualityAlertRepository } from "./repositories/rubber-quality-alert.repository.mongo";
import { PostgresRubberQualityAlertRepository } from "./repositories/rubber-quality-alert.repository.postgres";
import { RubberRollIssuanceRepository } from "./repositories/rubber-roll-issuance.repository";
import { MongoRubberRollIssuanceRepository } from "./repositories/rubber-roll-issuance.repository.mongo";
import { PostgresRubberRollIssuanceRepository } from "./repositories/rubber-roll-issuance.repository.postgres";
import { RubberRollIssuanceItemRepository } from "./repositories/rubber-roll-issuance-item.repository";
import { MongoRubberRollIssuanceItemRepository } from "./repositories/rubber-roll-issuance-item.repository.mongo";
import { PostgresRubberRollIssuanceItemRepository } from "./repositories/rubber-roll-issuance-item.repository.postgres";
import { RubberRollIssuanceLineItemRepository } from "./repositories/rubber-roll-issuance-line-item.repository";
import { MongoRubberRollIssuanceLineItemRepository } from "./repositories/rubber-roll-issuance-line-item.repository.mongo";
import { PostgresRubberRollIssuanceLineItemRepository } from "./repositories/rubber-roll-issuance-line-item.repository.postgres";
import { RubberRollRejectionRepository } from "./repositories/rubber-roll-rejection.repository";
import { MongoRubberRollRejectionRepository } from "./repositories/rubber-roll-rejection.repository.mongo";
import { PostgresRubberRollRejectionRepository } from "./repositories/rubber-roll-rejection.repository.postgres";
import { RubberRollStockRepository } from "./repositories/rubber-roll-stock.repository";
import { MongoRubberRollStockRepository } from "./repositories/rubber-roll-stock.repository.mongo";
import { PostgresRubberRollStockRepository } from "./repositories/rubber-roll-stock.repository.postgres";
import { RubberSpecificationRepository } from "./repositories/rubber-specification.repository";
import { MongoRubberSpecificationRepository } from "./repositories/rubber-specification.repository.mongo";
import { PostgresRubberSpecificationRepository } from "./repositories/rubber-specification.repository.postgres";
import { RubberStatementReconciliationRepository } from "./repositories/rubber-statement-reconciliation.repository";
import { MongoRubberStatementReconciliationRepository } from "./repositories/rubber-statement-reconciliation.repository.mongo";
import { PostgresRubberStatementReconciliationRepository } from "./repositories/rubber-statement-reconciliation.repository.postgres";
import { RubberStockLocationRepository } from "./repositories/rubber-stock-location.repository";
import { MongoRubberStockLocationRepository } from "./repositories/rubber-stock-location.repository.mongo";
import { PostgresRubberStockLocationRepository } from "./repositories/rubber-stock-location.repository.postgres";
import { RubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository";
import { MongoRubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository.mongo";
import { PostgresRubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository.postgres";
import { RubberTaxInvoiceRepository } from "./repositories/rubber-tax-invoice.repository";
import { MongoRubberTaxInvoiceRepository } from "./repositories/rubber-tax-invoice.repository.mongo";
import { PostgresRubberTaxInvoiceRepository } from "./repositories/rubber-tax-invoice.repository.postgres";
import { RubberTaxInvoiceCorrectionRepository } from "./repositories/rubber-tax-invoice-correction.repository";
import { MongoRubberTaxInvoiceCorrectionRepository } from "./repositories/rubber-tax-invoice-correction.repository.mongo";
import { PostgresRubberTaxInvoiceCorrectionRepository } from "./repositories/rubber-tax-invoice-correction.repository.postgres";
import { RubberThicknessRecommendationRepository } from "./repositories/rubber-thickness-recommendation.repository";
import { MongoRubberThicknessRecommendationRepository } from "./repositories/rubber-thickness-recommendation.repository.mongo";
import { PostgresRubberThicknessRecommendationRepository } from "./repositories/rubber-thickness-recommendation.repository.postgres";
import { RubberTypeRepository } from "./repositories/rubber-type.repository";
import { MongoRubberTypeRepository } from "./repositories/rubber-type.repository.mongo";
import { PostgresRubberTypeRepository } from "./repositories/rubber-type.repository.postgres";
import { TestimonialRepository } from "./repositories/testimonial.repository";
import { MongoTestimonialRepository } from "./repositories/testimonial.repository.mongo";
import { PostgresTestimonialRepository } from "./repositories/testimonial.repository.postgres";
import { WebsitePageRepository } from "./repositories/website-page.repository";
import { MongoWebsitePageRepository } from "./repositories/website-page.repository.mongo";
import { PostgresWebsitePageRepository } from "./repositories/website-page.repository.postgres";
import { RubberAccountingService } from "./rubber-accounting.service";
import { RubberAccountingPdfService } from "./rubber-accounting-pdf.service";
import { RubberAdminController } from "./rubber-admin.controller";
import { RubberAuCocService } from "./rubber-au-coc.service";
import { RubberAuCocReadinessService } from "./rubber-au-coc-readiness.service";
import { RubberBrandingService } from "./rubber-branding.service";
import { RubberCocService } from "./rubber-coc.service";
import { RubberCocExtractionService } from "./rubber-coc-extraction.service";
import { RubberCompanyDirectorService } from "./rubber-company-director.service";
import { RubberCostService } from "./rubber-cost.service";
import { RubberDeliveryNoteService } from "./rubber-delivery-note.service";
import { RubberDocumentVersioningService } from "./rubber-document-versioning.service";
import { RubberInboundEmailController } from "./rubber-inbound-email.controller";
import { RubberInboundEmailService } from "./rubber-inbound-email.service";
import { RubberLiningController } from "./rubber-lining.controller";
import { RubberLiningService } from "./rubber-lining.service";
import { RubberOrderImportService } from "./rubber-order-import.service";
import { RubberOtherStockService } from "./rubber-other-stock.service";
import { RubberPoTemplateService } from "./rubber-po-template.service";
import { RubberProductImportService } from "./rubber-product-import.service";
import { RubberQualityTrackingService } from "./rubber-quality-tracking.service";
import { RubberReferenceDataController } from "./rubber-reference-data.controller";
import { RubberRequisitionService } from "./rubber-requisition.service";
import { RubberRollIssuanceService } from "./rubber-roll-issuance.service";
import { RubberRollRejectionService } from "./rubber-roll-rejection.service";
import { RubberRollStockService } from "./rubber-roll-stock.service";
import { RubberSageCocAdapterService } from "./rubber-sage-coc-adapter.service";
import { RubberSageContactSyncService } from "./rubber-sage-contact-sync.service";
import { RubberSageInvoiceAdapterService } from "./rubber-sage-invoice-adapter.service";
import { RubberSageInvoicePostService } from "./rubber-sage-invoice-post.service";
import { RubberStatementReconciliationService } from "./rubber-statement-reconciliation.service";
import { RubberStockService } from "./rubber-stock.service";
import { RubberStockLocationService } from "./rubber-stock-location.service";
import { RubberSupplierCocReminderService } from "./rubber-supplier-coc-reminder.service";
import { RubberTaxInvoiceService } from "./rubber-tax-invoice.service";
import { BlogPostSchema } from "./schemas/blog-post.schema";
import { RubberAccountSignOffSchema } from "./schemas/rubber-account-sign-off.schema";
import { RubberAdhesionRequirementSchema } from "./schemas/rubber-adhesion-requirement.schema";
import { RubberAppProfileSchema } from "./schemas/rubber-app-profile.schema";
import { RubberApplicationRatingSchema } from "./schemas/rubber-application-rating.schema";
import { RubberAuCocSchema } from "./schemas/rubber-au-coc.schema";
import { RubberAuCocItemSchema } from "./schemas/rubber-au-coc-item.schema";
import { RubberChemicalCompatibilitySchema } from "./schemas/rubber-chemical-compatibility.schema";
import { RubberCocBatchCorrectionSchema } from "./schemas/rubber-coc-batch-correction.schema";
import { RubberCompanySchema } from "./schemas/rubber-company.schema";
import { RubberCompanyDirectorSchema } from "./schemas/rubber-company-director.schema";
import { RubberCompoundBatchSchema } from "./schemas/rubber-compound-batch.schema";
import { RubberCompoundMovementSchema } from "./schemas/rubber-compound-movement.schema";
import { RubberCompoundOrderSchema } from "./schemas/rubber-compound-order.schema";
import { RubberCompoundQualityConfigSchema } from "./schemas/rubber-compound-quality-config.schema";
import { RubberCompoundStockSchema } from "./schemas/rubber-compound-stock.schema";
import { RubberCostRateSchema } from "./schemas/rubber-cost-rate.schema";
import { RubberDeliveryNoteSchema } from "./schemas/rubber-delivery-note.schema";
import { RubberDeliveryNoteCorrectionSchema } from "./schemas/rubber-delivery-note-correction.schema";
import { RubberDeliveryNoteItemSchema } from "./schemas/rubber-delivery-note-item.schema";
import { RubberMonthlyAccountSchema } from "./schemas/rubber-monthly-account.schema";
import { RubberOrderSchema } from "./schemas/rubber-order.schema";
import { RubberOrderImportCorrectionSchema } from "./schemas/rubber-order-import-correction.schema";
import { RubberOrderItemSchema } from "./schemas/rubber-order-item.schema";
import { RubberOtherStockSchema } from "./schemas/rubber-other-stock.schema";
import { RubberPoExtractionRegionSchema } from "./schemas/rubber-po-extraction-region.schema";
import { RubberPoExtractionTemplateSchema } from "./schemas/rubber-po-extraction-template.schema";
import { RubberPricingTierSchema } from "./schemas/rubber-pricing-tier.schema";
import { RubberProductSchema } from "./schemas/rubber-product.schema";
import { RubberProductCodingSchema } from "./schemas/rubber-product-coding.schema";
import { RubberProductionSchema } from "./schemas/rubber-production.schema";
import { RubberPurchaseRequisitionSchema } from "./schemas/rubber-purchase-requisition.schema";
import { RubberPurchaseRequisitionItemSchema } from "./schemas/rubber-purchase-requisition-item.schema";
import { RubberQualityAlertSchema } from "./schemas/rubber-quality-alert.schema";
import { RubberRollIssuanceSchema } from "./schemas/rubber-roll-issuance.schema";
import { RubberRollIssuanceItemSchema } from "./schemas/rubber-roll-issuance-item.schema";
import { RubberRollIssuanceLineItemSchema } from "./schemas/rubber-roll-issuance-line-item.schema";
import { RubberRollRejectionSchema } from "./schemas/rubber-roll-rejection.schema";
import { RubberRollStockSchema } from "./schemas/rubber-roll-stock.schema";
import { RubberSpecificationSchema } from "./schemas/rubber-specification.schema";
import { RubberStatementReconciliationSchema } from "./schemas/rubber-statement-reconciliation.schema";
import { RubberStockLocationSchema } from "./schemas/rubber-stock-location.schema";
import { RubberSupplierCocSchema } from "./schemas/rubber-supplier-coc.schema";
import { RubberTaxInvoiceSchema } from "./schemas/rubber-tax-invoice.schema";
import { RubberTaxInvoiceCorrectionSchema } from "./schemas/rubber-tax-invoice-correction.schema";
import { RubberThicknessRecommendationSchema } from "./schemas/rubber-thickness-recommendation.schema";
import { RubberTypeSchema } from "./schemas/rubber-type.schema";
import { TestimonialSchema } from "./schemas/testimonial.schema";
import { WebsitePageSchema } from "./schemas/website-page.schema";
import { ArEmailAdapterService } from "./services/ar-email-adapter.service";
import { AuRubberDocumentFilerService } from "./services/au-rubber-document-filer.service";
import { PdfPageCacheService } from "./services/pdf-page-cache.service";
import { PdfSlicerService } from "./services/pdf-slicer.service";
import { RubberExtractionOrchestratorService } from "./services/rubber-extraction-orchestrator.service";
import { RubberOrderConfirmationService } from "./services/rubber-order-confirmation.service";
import { TestimonialsController } from "./testimonials.controller";
import { TestimonialsService } from "./testimonials.service";
import { WebsitePagesController } from "./website-pages.controller";
import { WebsitePagesService } from "./website-pages.service";

@Module({
  imports: [
    AdminModule,
    EmailModule,
    FeatureFlagsModule,
    LicensingModule,
    MetricsModule,
    NixModule,
    RbacModule,
    SageExportModule,
    SharedModule,
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "BlogPost", schema: BlogPostSchema },
            { name: "RubberAccountSignOff", schema: RubberAccountSignOffSchema },
            { name: "RubberAdhesionRequirement", schema: RubberAdhesionRequirementSchema },
            { name: "RubberApplicationRating", schema: RubberApplicationRatingSchema },
            { name: "RubberAppProfile", schema: RubberAppProfileSchema },
            { name: "RubberAuCoc", schema: RubberAuCocSchema },
            { name: "RubberAuCocItem", schema: RubberAuCocItemSchema },
            { name: "RubberChemicalCompatibility", schema: RubberChemicalCompatibilitySchema },
            { name: "RubberCocBatchCorrection", schema: RubberCocBatchCorrectionSchema },
            { name: "RubberCompany", schema: RubberCompanySchema },
            { name: "RubberCompanyDirector", schema: RubberCompanyDirectorSchema },
            { name: "RubberCompoundBatch", schema: RubberCompoundBatchSchema },
            { name: "RubberCompoundMovement", schema: RubberCompoundMovementSchema },
            { name: "RubberCompoundOrder", schema: RubberCompoundOrderSchema },
            { name: "RubberCompoundQualityConfig", schema: RubberCompoundQualityConfigSchema },
            { name: "RubberCompoundStock", schema: RubberCompoundStockSchema },
            { name: "RubberCostRate", schema: RubberCostRateSchema },
            { name: "RubberDeliveryNote", schema: RubberDeliveryNoteSchema },
            {
              name: "RubberDeliveryNoteCorrection",
              schema: RubberDeliveryNoteCorrectionSchema,
            },
            { name: "RubberDeliveryNoteItem", schema: RubberDeliveryNoteItemSchema },
            { name: "RubberMonthlyAccount", schema: RubberMonthlyAccountSchema },
            { name: "RubberOrderImportCorrection", schema: RubberOrderImportCorrectionSchema },
            { name: "RubberOrderItem", schema: RubberOrderItemSchema },
            {
              name: "RubberThicknessRecommendation",
              schema: RubberThicknessRecommendationSchema,
            },
            { name: "RubberOtherStock", schema: RubberOtherStockSchema },
            { name: "RubberPoExtractionTemplate", schema: RubberPoExtractionTemplateSchema },
            { name: "RubberPoExtractionRegion", schema: RubberPoExtractionRegionSchema },
            { name: "RubberQualityAlert", schema: RubberQualityAlertSchema },
            { name: "RubberRollRejection", schema: RubberRollRejectionSchema },
            {
              name: "RubberStatementReconciliation",
              schema: RubberStatementReconciliationSchema,
            },
            { name: "RubberStockLocation", schema: RubberStockLocationSchema },
            { name: "RubberSupplierCoc", schema: RubberSupplierCocSchema },
            { name: "Testimonial", schema: TestimonialSchema },
            { name: "WebsitePage", schema: WebsitePageSchema },
            { name: "RubberOrder", schema: RubberOrderSchema },
            { name: "RubberProduct", schema: RubberProductSchema },
            { name: "RubberProductCoding", schema: RubberProductCodingSchema },
            { name: "RubberProduction", schema: RubberProductionSchema },
            { name: "RubberType", schema: RubberTypeSchema },
            { name: "RubberSpecification", schema: RubberSpecificationSchema },
            { name: "RubberPricingTier", schema: RubberPricingTierSchema },
            {
              name: "RubberPurchaseRequisition",
              schema: RubberPurchaseRequisitionSchema,
            },
            {
              name: "RubberPurchaseRequisitionItem",
              schema: RubberPurchaseRequisitionItemSchema,
            },
            { name: "RubberRollIssuance", schema: RubberRollIssuanceSchema },
            { name: "RubberRollIssuanceItem", schema: RubberRollIssuanceItemSchema },
            {
              name: "RubberRollIssuanceLineItem",
              schema: RubberRollIssuanceLineItemSchema,
            },
            { name: "RubberRollStock", schema: RubberRollStockSchema },
            { name: "RubberTaxInvoice", schema: RubberTaxInvoiceSchema },
            {
              name: "RubberTaxInvoiceCorrection",
              schema: RubberTaxInvoiceCorrectionSchema,
            },
            { name: "App", schema: AppSchema },
            { name: "UserAppAccess", schema: UserAppAccessSchema },
            { name: "JobCard", schema: JobCardSchema },
            { name: "JobCardLineItem", schema: JobCardLineItemSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            AppPermission,
            AppRole,
            AppRolePermission,
            AppRoleProduct,
            UserAccessProduct,
            UserAppPermission,
            RubberChemicalCompatibility,
            App,
            UserAppAccess,
            RubberType,
            RubberSpecification,
            RubberApplicationRating,
            RubberThicknessRecommendation,
            RubberAdhesionRequirement,
            RubberProductCoding,
            RubberPricingTier,
            RubberCompany,
            RubberProduct,
            RubberOrder,
            RubberOrderItem,
            RubberCompoundStock,
            RubberCompoundMovement,
            RubberProduction,
            RubberCompoundOrder,
            RubberSupplierCoc,
            RubberCompoundBatch,
            RubberDeliveryNote,
            RubberDeliveryNoteCorrection,
            RubberDeliveryNoteItem,
            RubberRollStock,
            RubberAuCoc,
            RubberAuCocItem,
            RubberPurchaseRequisition,
            RubberPurchaseRequisitionItem,
            RubberStockLocation,
            RubberCompoundQualityConfig,
            RubberQualityAlert,
            RubberPoExtractionTemplate,
            RubberPoExtractionRegion,
            RubberOtherStock,
            RubberTaxInvoice,
            RubberTaxInvoiceCorrection,
            RubberCocBatchCorrection,
            RubberOrderImportCorrection,
            RubberRollRejection,
            RubberCostRate,
            RubberMonthlyAccount,
            RubberAccountSignOff,
            RubberStatementReconciliation,
            RubberCompanyDirector,
            RubberRollIssuance,
            RubberRollIssuanceItem,
            RubberRollIssuanceLineItem,
            RubberAppProfile,
            WebsitePage,
            Testimonial,
            BlogPost,
            JobCard,
            JobCardLineItem,
          ]),
        ]),
  ],
  controllers: [
    RubberLiningController,
    RubberReferenceDataController,
    RubberAdminController,
    RubberInboundEmailController,
    WebsitePagesController,
    TestimonialsController,
    BlogPostsController,
    PublicAuIndustriesController,
  ],
  providers: [
    RubberSupplierCocReminderService,
    AuRubberLicensingRegistrar,
    RubberLiningService,
    RubberStockService,
    RubberBrandingService,
    RubberCocService,
    RubberCocExtractionService,
    RubberDeliveryNoteService,
    RubberRollStockService,
    RubberAuCocService,
    RubberAuCocReadinessService,
    RubberRequisitionService,
    RubberStockLocationService,
    RubberInboundEmailService,
    RubberQualityTrackingService,
    RubberOrderImportService,
    RubberPoTemplateService,
    RubberProductImportService,
    RubberOtherStockService,
    RubberTaxInvoiceService,
    RubberDocumentVersioningService,
    RubberOrderConfirmationService,
    RubberRollIssuanceService,
    RubberRollRejectionService,
    RubberSageCocAdapterService,
    RubberSageContactSyncService,
    RubberSageInvoiceAdapterService,
    RubberSageInvoicePostService,
    RubberCostService,
    AuRubberAccessGuard,
    AuRubberFeatureGuard,
    WebsitePagesService,
    TestimonialsService,
    BlogPostsService,
    ArEmailAdapterService,
    AuRubberDocumentFilerService,
    PdfPageCacheService,
    PdfSlicerService,
    RubberExtractionOrchestratorService,
    RubberCompanyDirectorService,
    RubberAccountingPdfService,
    RubberAccountingService,
    RubberStatementReconciliationService,
    AuRubberCapabilities,
    repositoryProvider(BlogPostRepository, PostgresBlogPostRepository, MongoBlogPostRepository),
    repositoryProvider(
      RubberAccountSignOffRepository,
      PostgresRubberAccountSignOffRepository,
      MongoRubberAccountSignOffRepository,
    ),
    repositoryProvider(
      RubberAppProfileRepository,
      PostgresRubberAppProfileRepository,
      MongoRubberAppProfileRepository,
    ),
    repositoryProvider(
      RubberCompanyRepository,
      PostgresRubberCompanyRepository,
      MongoRubberCompanyRepository,
    ),
    repositoryProvider(
      RubberCompanyDirectorRepository,
      PostgresRubberCompanyDirectorRepository,
      MongoRubberCompanyDirectorRepository,
    ),
    repositoryProvider(
      RubberCompoundBatchRepository,
      PostgresRubberCompoundBatchRepository,
      MongoRubberCompoundBatchRepository,
    ),
    repositoryProvider(
      RubberCompoundMovementRepository,
      PostgresRubberCompoundMovementRepository,
      MongoRubberCompoundMovementRepository,
    ),
    repositoryProvider(
      RubberCompoundOrderRepository,
      PostgresRubberCompoundOrderRepository,
      MongoRubberCompoundOrderRepository,
    ),
    repositoryProvider(
      RubberCompoundQualityConfigRepository,
      PostgresRubberCompoundQualityConfigRepository,
      MongoRubberCompoundQualityConfigRepository,
    ),
    repositoryProvider(
      RubberCompoundStockRepository,
      PostgresRubberCompoundStockRepository,
      MongoRubberCompoundStockRepository,
    ),
    repositoryProvider(
      RubberCostRateRepository,
      PostgresRubberCostRateRepository,
      MongoRubberCostRateRepository,
    ),
    repositoryProvider(
      RubberMonthlyAccountRepository,
      PostgresRubberMonthlyAccountRepository,
      MongoRubberMonthlyAccountRepository,
    ),
    repositoryProvider(
      RubberOrderImportCorrectionRepository,
      PostgresRubberOrderImportCorrectionRepository,
      MongoRubberOrderImportCorrectionRepository,
    ),
    repositoryProvider(
      RubberAuCocRepository,
      PostgresRubberAuCocRepository,
      MongoRubberAuCocRepository,
    ),
    repositoryProvider(
      RubberAuCocItemRepository,
      PostgresRubberAuCocItemRepository,
      MongoRubberAuCocItemRepository,
    ),
    repositoryProvider(
      RubberApplicationRatingRepository,
      PostgresRubberApplicationRatingRepository,
      MongoRubberApplicationRatingRepository,
    ),
    repositoryProvider(
      RubberThicknessRecommendationRepository,
      PostgresRubberThicknessRecommendationRepository,
      MongoRubberThicknessRecommendationRepository,
    ),
    repositoryProvider(
      RubberAdhesionRequirementRepository,
      PostgresRubberAdhesionRequirementRepository,
      MongoRubberAdhesionRequirementRepository,
    ),
    repositoryProvider(
      RubberChemicalCompatibilityRepository,
      PostgresRubberChemicalCompatibilityRepository,
      MongoRubberChemicalCompatibilityRepository,
    ),
    repositoryProvider(
      RubberCocBatchCorrectionRepository,
      PostgresRubberCocBatchCorrectionRepository,
      MongoRubberCocBatchCorrectionRepository,
    ),
    repositoryProvider(
      RubberDeliveryNoteRepository,
      PostgresRubberDeliveryNoteRepository,
      MongoRubberDeliveryNoteRepository,
    ),
    repositoryProvider(
      RubberDeliveryNoteItemRepository,
      PostgresRubberDeliveryNoteItemRepository,
      MongoRubberDeliveryNoteItemRepository,
    ),
    repositoryProvider(
      RubberDeliveryNoteCorrectionRepository,
      PostgresRubberDeliveryNoteCorrectionRepository,
      MongoRubberDeliveryNoteCorrectionRepository,
    ),
    repositoryProvider(
      RubberOrderItemRepository,
      PostgresRubberOrderItemRepository,
      MongoRubberOrderItemRepository,
    ),
    repositoryProvider(
      RubberOtherStockRepository,
      PostgresRubberOtherStockRepository,
      MongoRubberOtherStockRepository,
    ),
    repositoryProvider(
      RubberPoExtractionTemplateRepository,
      PostgresRubberPoExtractionTemplateRepository,
      MongoRubberPoExtractionTemplateRepository,
    ),
    repositoryProvider(
      RubberPoExtractionRegionRepository,
      PostgresRubberPoExtractionRegionRepository,
      MongoRubberPoExtractionRegionRepository,
    ),
    repositoryProvider(
      RubberQualityAlertRepository,
      PostgresRubberQualityAlertRepository,
      MongoRubberQualityAlertRepository,
    ),
    repositoryProvider(
      RubberRollRejectionRepository,
      PostgresRubberRollRejectionRepository,
      MongoRubberRollRejectionRepository,
    ),
    repositoryProvider(
      RubberStatementReconciliationRepository,
      PostgresRubberStatementReconciliationRepository,
      MongoRubberStatementReconciliationRepository,
    ),
    repositoryProvider(
      RubberStockLocationRepository,
      PostgresRubberStockLocationRepository,
      MongoRubberStockLocationRepository,
    ),
    repositoryProvider(
      RubberSupplierCocRepository,
      PostgresRubberSupplierCocRepository,
      MongoRubberSupplierCocRepository,
    ),
    repositoryProvider(
      TestimonialRepository,
      PostgresTestimonialRepository,
      MongoTestimonialRepository,
    ),
    repositoryProvider(
      WebsitePageRepository,
      PostgresWebsitePageRepository,
      MongoWebsitePageRepository,
    ),
    repositoryProvider(
      RubberOrderRepository,
      PostgresRubberOrderRepository,
      MongoRubberOrderRepository,
    ),
    repositoryProvider(
      RubberProductRepository,
      PostgresRubberProductRepository,
      MongoRubberProductRepository,
    ),
    repositoryProvider(
      RubberProductCodingRepository,
      PostgresRubberProductCodingRepository,
      MongoRubberProductCodingRepository,
    ),
    repositoryProvider(
      RubberProductionRepository,
      PostgresRubberProductionRepository,
      MongoRubberProductionRepository,
    ),
    repositoryProvider(
      RubberTypeRepository,
      PostgresRubberTypeRepository,
      MongoRubberTypeRepository,
    ),
    repositoryProvider(
      RubberSpecificationRepository,
      PostgresRubberSpecificationRepository,
      MongoRubberSpecificationRepository,
    ),
    repositoryProvider(
      RubberPricingTierRepository,
      PostgresRubberPricingTierRepository,
      MongoRubberPricingTierRepository,
    ),
    repositoryProvider(
      RubberPurchaseRequisitionRepository,
      PostgresRubberPurchaseRequisitionRepository,
      MongoRubberPurchaseRequisitionRepository,
    ),
    repositoryProvider(
      RubberPurchaseRequisitionItemRepository,
      PostgresRubberPurchaseRequisitionItemRepository,
      MongoRubberPurchaseRequisitionItemRepository,
    ),
    repositoryProvider(
      RubberRollIssuanceRepository,
      PostgresRubberRollIssuanceRepository,
      MongoRubberRollIssuanceRepository,
    ),
    repositoryProvider(
      RubberRollIssuanceItemRepository,
      PostgresRubberRollIssuanceItemRepository,
      MongoRubberRollIssuanceItemRepository,
    ),
    repositoryProvider(
      RubberRollIssuanceLineItemRepository,
      PostgresRubberRollIssuanceLineItemRepository,
      MongoRubberRollIssuanceLineItemRepository,
    ),
    repositoryProvider(
      RubberRollStockRepository,
      PostgresRubberRollStockRepository,
      MongoRubberRollStockRepository,
    ),
    repositoryProvider(
      RubberTaxInvoiceRepository,
      PostgresRubberTaxInvoiceRepository,
      MongoRubberTaxInvoiceRepository,
    ),
    repositoryProvider(
      RubberTaxInvoiceCorrectionRepository,
      PostgresRubberTaxInvoiceCorrectionRepository,
      MongoRubberTaxInvoiceCorrectionRepository,
    ),
    repositoryProvider(AppRepository, PostgresAppRepository, MongoAppRepository),
    repositoryProvider(
      UserAppAccessRepository,
      PostgresUserAppAccessRepository,
      MongoUserAppAccessRepository,
    ),
    repositoryProvider(JobCardRepository, PostgresJobCardRepository, MongoJobCardRepository),
    repositoryProvider(
      JobCardLineItemRepository,
      PostgresJobCardLineItemRepository,
      MongoJobCardLineItemRepository,
    ),
  ],
  exports: [
    RubberLiningService,
    RubberStockService,
    RubberBrandingService,
    RubberCocService,
    RubberCocExtractionService,
    RubberDeliveryNoteService,
    RubberRollStockService,
    RubberAuCocService,
    RubberAuCocReadinessService,
    RubberRequisitionService,
    RubberStockLocationService,
    RubberQualityTrackingService,
    RubberOtherStockService,
    RubberTaxInvoiceService,
    RubberCostService,
    RubberAccountingService,
    RubberCompanyDirectorService,
    RubberStatementReconciliationService,
  ],
})
export class RubberLiningModule {}
