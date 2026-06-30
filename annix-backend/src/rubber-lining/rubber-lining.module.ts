import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { CompanyBrandingModule } from "../company-branding/company-branding.module";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { LicensingModule } from "../licensing";
import { MarketingModule } from "../marketing/marketing.module";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { RbacModule } from "../rbac/rbac.module";
import { AppRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import { MongoAppRepository, MongoUserAppAccessRepository } from "../rbac/rbac.repository.mongo";
import { AppSchema } from "../rbac/schemas/app.schema";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { SageExportModule } from "../sage-export/sage-export.module";
import { SharedModule } from "../shared/shared.module";
import { JobCardRepository } from "../stock-control/repositories/job-card.repository";
import { MongoJobCardRepository } from "../stock-control/repositories/job-card.repository.mongo";
import { JobCardLineItemRepository } from "../stock-control/repositories/job-card-line-item.repository";
import { MongoJobCardLineItemRepository } from "../stock-control/repositories/job-card-line-item.repository.mongo";
import { JobCardSchema } from "../stock-control/schemas/job-card.schema";
import { JobCardLineItemSchema } from "../stock-control/schemas/job-card-line-item.schema";
import { StorageModule } from "../storage/storage.module";
import { AffiliateCommissionController } from "./affiliate-commission.controller";
import { AuRubberLicensingRegistrar } from "./au-rubber-licensing.registrar";
import { BlogPostsController } from "./blog-posts.controller";
import { BlogPostsService } from "./blog-posts.service";
import { AuRubberCapabilities } from "./capabilities/au-rubber.capabilities";
import { ChemicalDocExtractionService } from "./chemical-document-extraction.service";
import { ChemicalSupplierDocumentController } from "./chemical-supplier-document.controller";
import { ChemicalSupplierDocumentService } from "./chemical-supplier-document.service";
import { CompoundDataSheetsController } from "./compound-data-sheets.controller";
import { CompoundDataSheetsService } from "./compound-data-sheets.service";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import { AuRubberFeatureGuard } from "./guards/au-rubber-feature.guard";
import { LinkedInFeedService } from "./linkedin-feed.service";
import { FathomProvider } from "./meetings/fathom.provider";
import { MeetingProviderRegistry } from "./meetings/meeting-provider.registry";
import { PublicAuIndustriesController } from "./public-au-industries.controller";
import { QuotationController } from "./quotation.controller";
import { AffiliateRepository } from "./repositories/affiliate.repository";
import { MongoAffiliateRepository } from "./repositories/affiliate.repository.mongo";
import { AffiliatePriceListRepository } from "./repositories/affiliate-price-list.repository";
import { MongoAffiliatePriceListRepository } from "./repositories/affiliate-price-list.repository.mongo";
import { AffiliatePriceListItemRepository } from "./repositories/affiliate-price-list-item.repository";
import { MongoAffiliatePriceListItemRepository } from "./repositories/affiliate-price-list-item.repository.mongo";
import { BlogPostRepository } from "./repositories/blog-post.repository";
import { MongoBlogPostRepository } from "./repositories/blog-post.repository.mongo";
import { ChemicalSupplierDocumentRepository } from "./repositories/chemical-supplier-document.repository";
import { MongoChemicalSupplierDocumentRepository } from "./repositories/chemical-supplier-document.repository.mongo";
import { CommissionPayoutRepository } from "./repositories/commission-payout.repository";
import { MongoCommissionPayoutRepository } from "./repositories/commission-payout.repository.mongo";
import { CompoundDataSheetRepository } from "./repositories/compound-data-sheet.repository";
import { MongoCompoundDataSheetRepository } from "./repositories/compound-data-sheet.repository.mongo";
import { QuotationRepository } from "./repositories/quotation.repository";
import { MongoQuotationRepository } from "./repositories/quotation.repository.mongo";
import { RubberAccountSignOffRepository } from "./repositories/rubber-account-sign-off.repository";
import { MongoRubberAccountSignOffRepository } from "./repositories/rubber-account-sign-off.repository.mongo";
import { RubberAdhesionRequirementRepository } from "./repositories/rubber-adhesion-requirement.repository";
import { MongoRubberAdhesionRequirementRepository } from "./repositories/rubber-adhesion-requirement.repository.mongo";
import { RubberAppProfileRepository } from "./repositories/rubber-app-profile.repository";
import { MongoRubberAppProfileRepository } from "./repositories/rubber-app-profile.repository.mongo";
import { RubberApplicationRatingRepository } from "./repositories/rubber-application-rating.repository";
import { MongoRubberApplicationRatingRepository } from "./repositories/rubber-application-rating.repository.mongo";
import { RubberAuCocRepository } from "./repositories/rubber-au-coc.repository";
import { MongoRubberAuCocRepository } from "./repositories/rubber-au-coc.repository.mongo";
import { RubberAuCocItemRepository } from "./repositories/rubber-au-coc-item.repository";
import { MongoRubberAuCocItemRepository } from "./repositories/rubber-au-coc-item.repository.mongo";
import { RubberBoardMeetingRepository } from "./repositories/rubber-board-meeting.repository";
import { MongoRubberBoardMeetingRepository } from "./repositories/rubber-board-meeting.repository.mongo";
import { RubberChemicalCompatibilityRepository } from "./repositories/rubber-chemical-compatibility.repository";
import { MongoRubberChemicalCompatibilityRepository } from "./repositories/rubber-chemical-compatibility.repository.mongo";
import { RubberCocBatchCorrectionRepository } from "./repositories/rubber-coc-batch-correction.repository";
import { MongoRubberCocBatchCorrectionRepository } from "./repositories/rubber-coc-batch-correction.repository.mongo";
import { RubberCompanyRepository } from "./repositories/rubber-company.repository";
import { MongoRubberCompanyRepository } from "./repositories/rubber-company.repository.mongo";
import { RubberCompanyDirectorRepository } from "./repositories/rubber-company-director.repository";
import { MongoRubberCompanyDirectorRepository } from "./repositories/rubber-company-director.repository.mongo";
import { RubberCompoundBatchRepository } from "./repositories/rubber-compound-batch.repository";
import { MongoRubberCompoundBatchRepository } from "./repositories/rubber-compound-batch.repository.mongo";
import { RubberCompoundMovementRepository } from "./repositories/rubber-compound-movement.repository";
import { MongoRubberCompoundMovementRepository } from "./repositories/rubber-compound-movement.repository.mongo";
import { RubberCompoundOrderRepository } from "./repositories/rubber-compound-order.repository";
import { MongoRubberCompoundOrderRepository } from "./repositories/rubber-compound-order.repository.mongo";
import { RubberCompoundQualityConfigRepository } from "./repositories/rubber-compound-quality-config.repository";
import { MongoRubberCompoundQualityConfigRepository } from "./repositories/rubber-compound-quality-config.repository.mongo";
import { RubberCompoundStockRepository } from "./repositories/rubber-compound-stock.repository";
import { MongoRubberCompoundStockRepository } from "./repositories/rubber-compound-stock.repository.mongo";
import { RubberCostRateRepository } from "./repositories/rubber-cost-rate.repository";
import { MongoRubberCostRateRepository } from "./repositories/rubber-cost-rate.repository.mongo";
import { RubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository";
import { MongoRubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository.mongo";
import { RubberDeliveryNoteCorrectionRepository } from "./repositories/rubber-delivery-note-correction.repository";
import { MongoRubberDeliveryNoteCorrectionRepository } from "./repositories/rubber-delivery-note-correction.repository.mongo";
import { RubberDeliveryNoteItemRepository } from "./repositories/rubber-delivery-note-item.repository";
import { MongoRubberDeliveryNoteItemRepository } from "./repositories/rubber-delivery-note-item.repository.mongo";
import { RubberMonthlyAccountRepository } from "./repositories/rubber-monthly-account.repository";
import { MongoRubberMonthlyAccountRepository } from "./repositories/rubber-monthly-account.repository.mongo";
import { RubberOrderRepository } from "./repositories/rubber-order.repository";
import { MongoRubberOrderRepository } from "./repositories/rubber-order.repository.mongo";
import { RubberOrderImportCorrectionRepository } from "./repositories/rubber-order-import-correction.repository";
import { MongoRubberOrderImportCorrectionRepository } from "./repositories/rubber-order-import-correction.repository.mongo";
import { RubberOrderItemRepository } from "./repositories/rubber-order-item.repository";
import { MongoRubberOrderItemRepository } from "./repositories/rubber-order-item.repository.mongo";
import { RubberOtherStockRepository } from "./repositories/rubber-other-stock.repository";
import { MongoRubberOtherStockRepository } from "./repositories/rubber-other-stock.repository.mongo";
import { RubberPoExtractionRegionRepository } from "./repositories/rubber-po-extraction-region.repository";
import { MongoRubberPoExtractionRegionRepository } from "./repositories/rubber-po-extraction-region.repository.mongo";
import { RubberPoExtractionTemplateRepository } from "./repositories/rubber-po-extraction-template.repository";
import { MongoRubberPoExtractionTemplateRepository } from "./repositories/rubber-po-extraction-template.repository.mongo";
import { RubberPricingTierRepository } from "./repositories/rubber-pricing-tier.repository";
import { MongoRubberPricingTierRepository } from "./repositories/rubber-pricing-tier.repository.mongo";
import { RubberProductRepository } from "./repositories/rubber-product.repository";
import { MongoRubberProductRepository } from "./repositories/rubber-product.repository.mongo";
import { RubberProductCodingRepository } from "./repositories/rubber-product-coding.repository";
import { MongoRubberProductCodingRepository } from "./repositories/rubber-product-coding.repository.mongo";
import { RubberProductionRepository } from "./repositories/rubber-production.repository";
import { MongoRubberProductionRepository } from "./repositories/rubber-production.repository.mongo";
import { RubberPurchaseRequisitionRepository } from "./repositories/rubber-purchase-requisition.repository";
import { MongoRubberPurchaseRequisitionRepository } from "./repositories/rubber-purchase-requisition.repository.mongo";
import { RubberPurchaseRequisitionItemRepository } from "./repositories/rubber-purchase-requisition-item.repository";
import { MongoRubberPurchaseRequisitionItemRepository } from "./repositories/rubber-purchase-requisition-item.repository.mongo";
import { RubberQualityAlertRepository } from "./repositories/rubber-quality-alert.repository";
import { MongoRubberQualityAlertRepository } from "./repositories/rubber-quality-alert.repository.mongo";
import { RubberRollIssuanceRepository } from "./repositories/rubber-roll-issuance.repository";
import { MongoRubberRollIssuanceRepository } from "./repositories/rubber-roll-issuance.repository.mongo";
import { RubberRollIssuanceItemRepository } from "./repositories/rubber-roll-issuance-item.repository";
import { MongoRubberRollIssuanceItemRepository } from "./repositories/rubber-roll-issuance-item.repository.mongo";
import { RubberRollIssuanceLineItemRepository } from "./repositories/rubber-roll-issuance-line-item.repository";
import { MongoRubberRollIssuanceLineItemRepository } from "./repositories/rubber-roll-issuance-line-item.repository.mongo";
import { RubberRollRejectionRepository } from "./repositories/rubber-roll-rejection.repository";
import { MongoRubberRollRejectionRepository } from "./repositories/rubber-roll-rejection.repository.mongo";
import { RubberRollStockRepository } from "./repositories/rubber-roll-stock.repository";
import { MongoRubberRollStockRepository } from "./repositories/rubber-roll-stock.repository.mongo";
import { RubberSpecificationRepository } from "./repositories/rubber-specification.repository";
import { MongoRubberSpecificationRepository } from "./repositories/rubber-specification.repository.mongo";
import { RubberStatementReconciliationRepository } from "./repositories/rubber-statement-reconciliation.repository";
import { MongoRubberStatementReconciliationRepository } from "./repositories/rubber-statement-reconciliation.repository.mongo";
import { RubberStockLocationRepository } from "./repositories/rubber-stock-location.repository";
import { MongoRubberStockLocationRepository } from "./repositories/rubber-stock-location.repository.mongo";
import { RubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository";
import { MongoRubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository.mongo";
import { RubberTaxInvoiceRepository } from "./repositories/rubber-tax-invoice.repository";
import { MongoRubberTaxInvoiceRepository } from "./repositories/rubber-tax-invoice.repository.mongo";
import { RubberTaxInvoiceCorrectionRepository } from "./repositories/rubber-tax-invoice-correction.repository";
import { MongoRubberTaxInvoiceCorrectionRepository } from "./repositories/rubber-tax-invoice-correction.repository.mongo";
import { RubberThicknessRecommendationRepository } from "./repositories/rubber-thickness-recommendation.repository";
import { MongoRubberThicknessRecommendationRepository } from "./repositories/rubber-thickness-recommendation.repository.mongo";
import { RubberTypeRepository } from "./repositories/rubber-type.repository";
import { MongoRubberTypeRepository } from "./repositories/rubber-type.repository.mongo";
import { SalesRepRepository } from "./repositories/sales-rep.repository";
import { MongoSalesRepRepository } from "./repositories/sales-rep.repository.mongo";
import { TestimonialRepository } from "./repositories/testimonial.repository";
import { MongoTestimonialRepository } from "./repositories/testimonial.repository.mongo";
import { WebsitePageRepository } from "./repositories/website-page.repository";
import { MongoWebsitePageRepository } from "./repositories/website-page.repository.mongo";
import { RubberAccountingService } from "./rubber-accounting.service";
import { RubberAccountingPdfService } from "./rubber-accounting-pdf.service";
import { RubberAdminController } from "./rubber-admin.controller";
import { RubberAuCocService } from "./rubber-au-coc.service";
import { RubberAuCocReadinessService } from "./rubber-au-coc-readiness.service";
import { RubberBoardMeetingService } from "./rubber-board-meeting.service";
import { RubberBoardMeetingAiService } from "./rubber-board-meeting-ai.service";
import { RubberBoardMeetingPdfService } from "./rubber-board-meeting-pdf.service";
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
import { RubberReferenceCacheService } from "./rubber-reference-cache.service";
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
import { AffiliateSchema } from "./schemas/affiliate.schema";
import { AffiliatePriceListSchema } from "./schemas/affiliate-price-list.schema";
import { AffiliatePriceListItemSchema } from "./schemas/affiliate-price-list-item.schema";
import { BlogPostSchema } from "./schemas/blog-post.schema";
import { ChemicalSupplierDocumentSchema } from "./schemas/chemical-supplier-document.schema";
import { CommissionPayoutSchema } from "./schemas/commission-payout.schema";
import { CompoundDataSheetSchema } from "./schemas/compound-data-sheet.schema";
import { QuotationSchema } from "./schemas/quotation.schema";
import { QuotationItemSchema } from "./schemas/quotation-item.schema";
import { RubberAccountSignOffSchema } from "./schemas/rubber-account-sign-off.schema";
import { RubberAdhesionRequirementSchema } from "./schemas/rubber-adhesion-requirement.schema";
import { RubberAppProfileSchema } from "./schemas/rubber-app-profile.schema";
import { RubberApplicationRatingSchema } from "./schemas/rubber-application-rating.schema";
import { RubberAuCocSchema } from "./schemas/rubber-au-coc.schema";
import { RubberAuCocItemSchema } from "./schemas/rubber-au-coc-item.schema";
import { RubberBoardMeetingSchema } from "./schemas/rubber-board-meeting.schema";
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
import { SalesRepSchema } from "./schemas/sales-rep.schema";
import { TestimonialSchema } from "./schemas/testimonial.schema";
import { WebsitePageSchema } from "./schemas/website-page.schema";
import { AffiliatePriceListService } from "./services/affiliate-price-list.service";
import { ArEmailAdapterService } from "./services/ar-email-adapter.service";
import { AuRubberDocumentFilerService } from "./services/au-rubber-document-filer.service";
import { PdfPageCacheService } from "./services/pdf-page-cache.service";
import { PdfSlicerService } from "./services/pdf-slicer.service";
import { QuotationService } from "./services/quotation.service";
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
    MarketingModule,
    MetricsModule,
    NixModule,
    RbacModule,
    SageExportModule,
    SharedModule,
    StorageModule,
    CompanyBrandingModule,
    MongooseModule.forFeature([
      { name: "BlogPost", schema: BlogPostSchema },
      {
        name: "ChemicalSupplierDocument",
        schema: ChemicalSupplierDocumentSchema,
      },
      { name: "CompoundDataSheet", schema: CompoundDataSheetSchema },
      { name: "Affiliate", schema: AffiliateSchema },
      { name: "SalesRep", schema: SalesRepSchema },
      { name: "AffiliatePriceList", schema: AffiliatePriceListSchema },
      { name: "AffiliatePriceListItem", schema: AffiliatePriceListItemSchema },
      { name: "CommissionPayout", schema: CommissionPayoutSchema },
      { name: "RubberAccountSignOff", schema: RubberAccountSignOffSchema },
      { name: "RubberAdhesionRequirement", schema: RubberAdhesionRequirementSchema },
      { name: "RubberApplicationRating", schema: RubberApplicationRatingSchema },
      { name: "RubberAppProfile", schema: RubberAppProfileSchema },
      { name: "RubberAuCoc", schema: RubberAuCocSchema },
      { name: "RubberAuCocItem", schema: RubberAuCocItemSchema },
      { name: "RubberBoardMeeting", schema: RubberBoardMeetingSchema },
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
      { name: "Quotation", schema: QuotationSchema },
      { name: "QuotationItem", schema: QuotationItemSchema },
    ]),
  ],
  controllers: [
    RubberLiningController,
    RubberReferenceDataController,
    RubberAdminController,
    RubberInboundEmailController,
    AffiliateCommissionController,
    WebsitePagesController,
    TestimonialsController,
    BlogPostsController,
    CompoundDataSheetsController,
    ChemicalSupplierDocumentController,
    PublicAuIndustriesController,
    QuotationController,
  ],
  providers: [
    RubberSupplierCocReminderService,
    AuRubberLicensingRegistrar,
    RubberReferenceCacheService,
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
    CompoundDataSheetsService,
    ChemicalSupplierDocumentService,
    ChemicalDocExtractionService,
    LinkedInFeedService,
    ArEmailAdapterService,
    AuRubberDocumentFilerService,
    PdfPageCacheService,
    PdfSlicerService,
    RubberExtractionOrchestratorService,
    RubberCompanyDirectorService,
    RubberBoardMeetingService,
    RubberBoardMeetingAiService,
    RubberBoardMeetingPdfService,
    FathomProvider,
    MeetingProviderRegistry,
    RubberAccountingPdfService,
    RubberAccountingService,
    RubberStatementReconciliationService,
    AffiliatePriceListService,
    AuRubberCapabilities,
    QuotationService,
    repositoryProvider(QuotationRepository, MongoQuotationRepository),
    repositoryProvider(AffiliateRepository, MongoAffiliateRepository),
    repositoryProvider(SalesRepRepository, MongoSalesRepRepository),
    repositoryProvider(AffiliatePriceListRepository, MongoAffiliatePriceListRepository),
    repositoryProvider(AffiliatePriceListItemRepository, MongoAffiliatePriceListItemRepository),
    repositoryProvider(CommissionPayoutRepository, MongoCommissionPayoutRepository),
    repositoryProvider(RubberBoardMeetingRepository, MongoRubberBoardMeetingRepository),
    repositoryProvider(BlogPostRepository, MongoBlogPostRepository),
    repositoryProvider(ChemicalSupplierDocumentRepository, MongoChemicalSupplierDocumentRepository),
    repositoryProvider(CompoundDataSheetRepository, MongoCompoundDataSheetRepository),
    repositoryProvider(RubberAccountSignOffRepository, MongoRubberAccountSignOffRepository),
    repositoryProvider(RubberAppProfileRepository, MongoRubberAppProfileRepository),
    repositoryProvider(RubberCompanyRepository, MongoRubberCompanyRepository),
    repositoryProvider(RubberCompanyDirectorRepository, MongoRubberCompanyDirectorRepository),
    repositoryProvider(RubberCompoundBatchRepository, MongoRubberCompoundBatchRepository),
    repositoryProvider(RubberCompoundMovementRepository, MongoRubberCompoundMovementRepository),
    repositoryProvider(RubberCompoundOrderRepository, MongoRubberCompoundOrderRepository),
    repositoryProvider(
      RubberCompoundQualityConfigRepository,
      MongoRubberCompoundQualityConfigRepository,
    ),
    repositoryProvider(RubberCompoundStockRepository, MongoRubberCompoundStockRepository),
    repositoryProvider(RubberCostRateRepository, MongoRubberCostRateRepository),
    repositoryProvider(RubberMonthlyAccountRepository, MongoRubberMonthlyAccountRepository),
    repositoryProvider(
      RubberOrderImportCorrectionRepository,
      MongoRubberOrderImportCorrectionRepository,
    ),
    repositoryProvider(RubberAuCocRepository, MongoRubberAuCocRepository),
    repositoryProvider(RubberAuCocItemRepository, MongoRubberAuCocItemRepository),
    repositoryProvider(RubberApplicationRatingRepository, MongoRubberApplicationRatingRepository),
    repositoryProvider(
      RubberThicknessRecommendationRepository,
      MongoRubberThicknessRecommendationRepository,
    ),
    repositoryProvider(
      RubberAdhesionRequirementRepository,
      MongoRubberAdhesionRequirementRepository,
    ),
    repositoryProvider(
      RubberChemicalCompatibilityRepository,
      MongoRubberChemicalCompatibilityRepository,
    ),
    repositoryProvider(RubberCocBatchCorrectionRepository, MongoRubberCocBatchCorrectionRepository),
    repositoryProvider(RubberDeliveryNoteRepository, MongoRubberDeliveryNoteRepository),
    repositoryProvider(RubberDeliveryNoteItemRepository, MongoRubberDeliveryNoteItemRepository),
    repositoryProvider(
      RubberDeliveryNoteCorrectionRepository,
      MongoRubberDeliveryNoteCorrectionRepository,
    ),
    repositoryProvider(RubberOrderItemRepository, MongoRubberOrderItemRepository),
    repositoryProvider(RubberOtherStockRepository, MongoRubberOtherStockRepository),
    repositoryProvider(
      RubberPoExtractionTemplateRepository,
      MongoRubberPoExtractionTemplateRepository,
    ),
    repositoryProvider(RubberPoExtractionRegionRepository, MongoRubberPoExtractionRegionRepository),
    repositoryProvider(RubberQualityAlertRepository, MongoRubberQualityAlertRepository),
    repositoryProvider(RubberRollRejectionRepository, MongoRubberRollRejectionRepository),
    repositoryProvider(
      RubberStatementReconciliationRepository,
      MongoRubberStatementReconciliationRepository,
    ),
    repositoryProvider(RubberStockLocationRepository, MongoRubberStockLocationRepository),
    repositoryProvider(RubberSupplierCocRepository, MongoRubberSupplierCocRepository),
    repositoryProvider(TestimonialRepository, MongoTestimonialRepository),
    repositoryProvider(WebsitePageRepository, MongoWebsitePageRepository),
    repositoryProvider(RubberOrderRepository, MongoRubberOrderRepository),
    repositoryProvider(RubberProductRepository, MongoRubberProductRepository),
    repositoryProvider(RubberProductCodingRepository, MongoRubberProductCodingRepository),
    repositoryProvider(RubberProductionRepository, MongoRubberProductionRepository),
    repositoryProvider(RubberTypeRepository, MongoRubberTypeRepository),
    repositoryProvider(RubberSpecificationRepository, MongoRubberSpecificationRepository),
    repositoryProvider(RubberPricingTierRepository, MongoRubberPricingTierRepository),
    repositoryProvider(
      RubberPurchaseRequisitionRepository,
      MongoRubberPurchaseRequisitionRepository,
    ),
    repositoryProvider(
      RubberPurchaseRequisitionItemRepository,
      MongoRubberPurchaseRequisitionItemRepository,
    ),
    repositoryProvider(RubberRollIssuanceRepository, MongoRubberRollIssuanceRepository),
    repositoryProvider(RubberRollIssuanceItemRepository, MongoRubberRollIssuanceItemRepository),
    repositoryProvider(
      RubberRollIssuanceLineItemRepository,
      MongoRubberRollIssuanceLineItemRepository,
    ),
    repositoryProvider(RubberRollStockRepository, MongoRubberRollStockRepository),
    repositoryProvider(RubberTaxInvoiceRepository, MongoRubberTaxInvoiceRepository),
    repositoryProvider(
      RubberTaxInvoiceCorrectionRepository,
      MongoRubberTaxInvoiceCorrectionRepository,
    ),
    repositoryProvider(AppRepository, MongoAppRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
    repositoryProvider(JobCardRepository, MongoJobCardRepository),
    repositoryProvider(JobCardLineItemRepository, MongoJobCardLineItemRepository),
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
    RubberBoardMeetingService,
    RubberStatementReconciliationService,
    RubberRollStockRepository,
  ],
})
export class RubberLiningModule {}
