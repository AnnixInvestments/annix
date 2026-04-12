import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { NixModule } from "../nix/nix.module";
import { App } from "../rbac/entities/app.entity";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { RbacModule } from "../rbac/rbac.module";
import { SageExportModule } from "../sage-export/sage-export.module";
import { SharedModule } from "../shared/shared.module";
import { JobCard } from "../stock-control/entities/job-card.entity";
import { JobCardLineItem } from "../stock-control/entities/job-card-line-item.entity";
import { RubberAccountSignOff } from "./entities/rubber-account-sign-off.entity";
import { RubberAppProfile } from "./entities/rubber-app-profile.entity";
import {
  RubberAdhesionRequirement,
  RubberApplicationRating,
  RubberThicknessRecommendation,
} from "./entities/rubber-application.entity";
import { RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { RubberAuCocItem } from "./entities/rubber-au-coc-item.entity";
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
import { WebsitePage } from "./entities/website-page.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import { PublicAuIndustriesController } from "./public-au-industries.controller";
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
import { RubberTaxInvoiceService } from "./rubber-tax-invoice.service";
import { ArEmailAdapterService } from "./services/ar-email-adapter.service";
import { RubberExtractionOrchestratorService } from "./services/rubber-extraction-orchestrator.service";
import { RubberOrderConfirmationService } from "./services/rubber-order-confirmation.service";
import { WebsitePagesController } from "./website-pages.controller";
import { WebsitePagesService } from "./website-pages.service";

@Module({
  imports: [
    AdminModule,
    EmailModule,
    NixModule,
    RbacModule,
    SageExportModule,
    SharedModule,
    TypeOrmModule.forFeature([
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
      JobCard,
      JobCardLineItem,
    ]),
  ],
  controllers: [
    RubberLiningController,
    RubberAdminController,
    RubberInboundEmailController,
    WebsitePagesController,
    PublicAuIndustriesController,
  ],
  providers: [
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
    WebsitePagesService,
    ArEmailAdapterService,
    RubberExtractionOrchestratorService,
    RubberCompanyDirectorService,
    RubberAccountingPdfService,
    RubberAccountingService,
    RubberStatementReconciliationService,
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
