import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { AdminModule } from "../admin/admin.module";
import { CoatingSpecificationModule } from "../coating-specification/coating-specification.module";
import { EmailModule } from "../email/email.module";
import { FlangeDimensionModule } from "../flange-dimension/flange-dimension.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NbOdLookupModule } from "../nb-od-lookup/nb-od-lookup.module";
import { NixModule } from "../nix/nix.module";
import { PipeScheduleModule } from "../pipe-schedule/pipe-schedule.module";
import { AppRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import { MongoAppRepository, MongoUserAppAccessRepository } from "../rbac/rbac.repository.mongo";
import { AppSchema } from "../rbac/schemas/app.schema";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { RubberLiningModule } from "../rubber-lining/rubber-lining.module";
import { SageExportModule } from "../sage-export/sage-export.module";
import { SharedModule } from "../shared/shared.module";
import { StaffLeaveModule } from "../staff-leave/staff-leave.module";
import { StockManagementModule } from "../stock-management/stock-management.module";
import { StorageModule } from "../storage/storage.module";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { StockControlCapabilities } from "./capabilities/stock-control.capabilities";
import { StockControlAuthController } from "./controllers/auth.controller";
import { CertificateController } from "./controllers/certificate.controller";
import { ChatController } from "./controllers/chat.controller";
import { CpoController } from "./controllers/cpo.controller";
import { StockControlCustomersController } from "./controllers/customers.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { DeliveriesController } from "./controllers/deliveries.controller";
import { GlossaryController } from "./controllers/glossary.controller";
import { ImportController } from "./controllers/import.controller";
import { InspectionPublicController } from "./controllers/inspection-public.controller";
import { InventoryController } from "./controllers/inventory.controller";
import { InvitationController } from "./controllers/invitation.controller";
import { InvoicesController } from "./controllers/invoices.controller";
import { JobCardImportController } from "./controllers/job-card-import.controller";
import { JobCardsController } from "./controllers/job-cards.controller";
import { MovementsController } from "./controllers/movements.controller";
import { PublicBrandingController } from "./controllers/public-branding.controller";
import { QrCodeController } from "./controllers/qr-code.controller";
import { ReconciliationController } from "./controllers/reconciliation.controller";
import { ReportsController } from "./controllers/reports.controller";
import { RequisitionsController } from "./controllers/requisitions.controller";
import { RubberBondingAgentController } from "./controllers/rubber-bonding-agent.controller";
import { RubberPricingController } from "./controllers/rubber-pricing.controller";
import { SearchController } from "./controllers/search.controller";
import { SignatureController } from "./controllers/signature.controller";
import { StaffController } from "./controllers/staff.controller";
import { StockTakeReconciliationController } from "./controllers/stock-take-reconciliation.controller";
import { SupplierController } from "./controllers/supplier.controller";
import { SupplierDocumentController } from "./controllers/supplier-document.controller";
import { WorkflowController } from "./controllers/workflow.controller";
import { MessagingEnabledGuard } from "./guards/messaging-enabled.guard";
import { StockControlAuthGuard } from "./guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "./guards/stock-control-onboarding.guard";
import { StockControlRoleGuard } from "./guards/stock-control-role.guard";
import { PaintPricingModule } from "./paint-pricing/paint-pricing.module";
import { QcModule } from "./qc/qc.module";
import { CalibrationCertificateRepository } from "./qc/repositories/calibration-certificate.repository";
import { MongoCalibrationCertificateRepository } from "./qc/repositories/calibration-certificate.repository.mongo";
import { QcBatchAssignmentRepository } from "./qc/repositories/qc-batch-assignment.repository";
import { MongoQcBatchAssignmentRepository } from "./qc/repositories/qc-batch-assignment.repository.mongo";
import { QcBlastProfileRepository } from "./qc/repositories/qc-blast-profile.repository";
import { MongoQcBlastProfileRepository } from "./qc/repositories/qc-blast-profile.repository.mongo";
import { QcControlPlanRepository } from "./qc/repositories/qc-control-plan.repository";
import { MongoQcControlPlanRepository } from "./qc/repositories/qc-control-plan.repository.mongo";
import { QcDefelskoBatchRepository } from "./qc/repositories/qc-defelsko-batch.repository";
import { MongoQcDefelskoBatchRepository } from "./qc/repositories/qc-defelsko-batch.repository.mongo";
import { QcDftReadingRepository } from "./qc/repositories/qc-dft-reading.repository";
import { MongoQcDftReadingRepository } from "./qc/repositories/qc-dft-reading.repository.mongo";
import { QcDustDebrisTestRepository } from "./qc/repositories/qc-dust-debris-test.repository";
import { MongoQcDustDebrisTestRepository } from "./qc/repositories/qc-dust-debris-test.repository.mongo";
import { QcItemsReleaseRepository } from "./qc/repositories/qc-items-release.repository";
import { MongoQcItemsReleaseRepository } from "./qc/repositories/qc-items-release.repository.mongo";
import { QcPullTestRepository } from "./qc/repositories/qc-pull-test.repository";
import { MongoQcPullTestRepository } from "./qc/repositories/qc-pull-test.repository.mongo";
import { QcReleaseCertificateRepository } from "./qc/repositories/qc-release-certificate.repository";
import { MongoQcReleaseCertificateRepository } from "./qc/repositories/qc-release-certificate.repository.mongo";
import { QcShoreHardnessRepository } from "./qc/repositories/qc-shore-hardness.repository";
import { MongoQcShoreHardnessRepository } from "./qc/repositories/qc-shore-hardness.repository.mongo";
import { CalibrationCertificateSchema } from "./qc/schemas/calibration-certificate.schema";
import { QcBatchAssignmentSchema } from "./qc/schemas/qc-batch-assignment.schema";
import { QcBlastProfileSchema } from "./qc/schemas/qc-blast-profile.schema";
import { QcControlPlanSchema } from "./qc/schemas/qc-control-plan.schema";
import { QcDefelskoBatchSchema } from "./qc/schemas/qc-defelsko-batch.schema";
import { QcDftReadingSchema } from "./qc/schemas/qc-dft-reading.schema";
import { QcDustDebrisTestSchema } from "./qc/schemas/qc-dust-debris-test.schema";
import { QcItemsReleaseSchema } from "./qc/schemas/qc-items-release.schema";
import { QcPullTestSchema } from "./qc/schemas/qc-pull-test.schema";
import { QcReleaseCertificateSchema } from "./qc/schemas/qc-release-certificate.schema";
import { QcShoreHardnessSchema } from "./qc/schemas/qc-shore-hardness.schema";
import { ChatConversationRepository } from "./repositories/chat-conversation.repository";
import { MongoChatConversationRepository } from "./repositories/chat-conversation.repository.mongo";
import { ChatConversationParticipantRepository } from "./repositories/chat-conversation-participant.repository";
import { MongoChatConversationParticipantRepository } from "./repositories/chat-conversation-participant.repository.mongo";
import { ChatMessageRepository } from "./repositories/chat-message.repository";
import { MongoChatMessageRepository } from "./repositories/chat-message.repository.mongo";
import { JobCardCoatingAnalysisRepository } from "./repositories/coating-analysis.repository";
import { MongoJobCardCoatingAnalysisRepository } from "./repositories/coating-analysis.repository.mongo";
import { CpoCalloffRecordRepository } from "./repositories/cpo-calloff-record.repository";
import { MongoCpoCalloffRecordRepository } from "./repositories/cpo-calloff-record.repository.mongo";
import { CustomerPurchaseOrderRepository } from "./repositories/customer-purchase-order.repository";
import { MongoCustomerPurchaseOrderRepository } from "./repositories/customer-purchase-order.repository.mongo";
import { CustomerPurchaseOrderItemRepository } from "./repositories/customer-purchase-order-item.repository";
import { MongoCustomerPurchaseOrderItemRepository } from "./repositories/customer-purchase-order-item.repository.mongo";
import { DashboardPreferenceRepository } from "./repositories/dashboard-preference.repository";
import { MongoDashboardPreferenceRepository } from "./repositories/dashboard-preference.repository.mongo";
import { DeliveryNoteRepository } from "./repositories/delivery-note.repository";
import { MongoDeliveryNoteRepository } from "./repositories/delivery-note.repository.mongo";
import { DeliveryNoteItemRepository } from "./repositories/delivery-note-item.repository";
import { MongoDeliveryNoteItemRepository } from "./repositories/delivery-note-item.repository.mongo";
import { DispatchCdnRepository } from "./repositories/dispatch-cdn.repository";
import { MongoDispatchCdnRepository } from "./repositories/dispatch-cdn.repository.mongo";
import { DispatchLoadPhotoRepository } from "./repositories/dispatch-load-photo.repository";
import { MongoDispatchLoadPhotoRepository } from "./repositories/dispatch-load-photo.repository.mongo";
import { DispatchScanRepository } from "./repositories/dispatch-scan.repository";
import { MongoDispatchScanRepository } from "./repositories/dispatch-scan.repository.mongo";
import { DnExtractionCorrectionRepository } from "./repositories/dn-extraction-correction.repository";
import { MongoDnExtractionCorrectionRepository } from "./repositories/dn-extraction-correction.repository.mongo";
import { GlossaryTermRepository } from "./repositories/glossary-term.repository";
import { MongoGlossaryTermRepository } from "./repositories/glossary-term.repository.mongo";
import { InspectionBookingRepository } from "./repositories/inspection-booking.repository";
import { MongoInspectionBookingRepository } from "./repositories/inspection-booking.repository.mongo";
import { InvoiceClarificationRepository } from "./repositories/invoice-clarification.repository";
import { MongoInvoiceClarificationRepository } from "./repositories/invoice-clarification.repository.mongo";
import { InvoiceExtractionCorrectionRepository } from "./repositories/invoice-extraction-correction.repository";
import { MongoInvoiceExtractionCorrectionRepository } from "./repositories/invoice-extraction-correction.repository.mongo";
import { IssuanceBatchRecordRepository } from "./repositories/issuance-batch-record.repository";
import { MongoIssuanceBatchRecordRepository } from "./repositories/issuance-batch-record.repository.mongo";
import { IssuanceSessionRepository } from "./repositories/issuance-session.repository";
import { MongoIssuanceSessionRepository } from "./repositories/issuance-session.repository.mongo";
import { JobCardRepository } from "./repositories/job-card.repository";
import { MongoJobCardRepository } from "./repositories/job-card.repository.mongo";
import { JobCardActionCompletionRepository } from "./repositories/job-card-action-completion.repository";
import { MongoJobCardActionCompletionRepository } from "./repositories/job-card-action-completion.repository.mongo";
import { JobCardApprovalRepository } from "./repositories/job-card-approval.repository";
import { MongoJobCardApprovalRepository } from "./repositories/job-card-approval.repository.mongo";
import { JobCardAttachmentRepository } from "./repositories/job-card-attachment.repository";
import { MongoJobCardAttachmentRepository } from "./repositories/job-card-attachment.repository.mongo";
import { JobCardBackgroundCompletionRepository } from "./repositories/job-card-background-completion.repository";
import { MongoJobCardBackgroundCompletionRepository } from "./repositories/job-card-background-completion.repository.mongo";
import { JobCardDataBookRepository } from "./repositories/job-card-data-book.repository";
import { MongoJobCardDataBookRepository } from "./repositories/job-card-data-book.repository.mongo";
import { JobCardDocumentRepository } from "./repositories/job-card-document.repository";
import { MongoJobCardDocumentRepository } from "./repositories/job-card-document.repository.mongo";
import { JobCardExtractionCorrectionRepository } from "./repositories/job-card-extraction-correction.repository";
import { MongoJobCardExtractionCorrectionRepository } from "./repositories/job-card-extraction-correction.repository.mongo";
import { JobCardImportJobRepository } from "./repositories/job-card-import-job.repository";
import { MongoJobCardImportJobRepository } from "./repositories/job-card-import-job.repository.mongo";
import { JobCardImportMappingRepository } from "./repositories/job-card-import-mapping.repository";
import { MongoJobCardImportMappingRepository } from "./repositories/job-card-import-mapping.repository.mongo";
import { JobCardJobFileRepository } from "./repositories/job-card-job-file.repository";
import { MongoJobCardJobFileRepository } from "./repositories/job-card-job-file.repository.mongo";
import { JobCardLineItemRepository } from "./repositories/job-card-line-item.repository";
import { MongoJobCardLineItemRepository } from "./repositories/job-card-line-item.repository.mongo";
import { JobCardVersionRepository } from "./repositories/job-card-version.repository";
import { MongoJobCardVersionRepository } from "./repositories/job-card-version.repository.mongo";
import { PushSubscriptionRepository } from "./repositories/push-subscription.repository";
import { MongoPushSubscriptionRepository } from "./repositories/push-subscription.repository.mongo";
import { QaReviewDecisionRepository } from "./repositories/qa-review-decision.repository";
import { MongoQaReviewDecisionRepository } from "./repositories/qa-review-decision.repository.mongo";
import { ReconciliationDocumentRepository } from "./repositories/reconciliation-document.repository";
import { MongoReconciliationDocumentRepository } from "./repositories/reconciliation-document.repository.mongo";
import { ReconciliationEventRepository } from "./repositories/reconciliation-event.repository";
import { MongoReconciliationEventRepository } from "./repositories/reconciliation-event.repository.mongo";
import { ReconciliationItemRepository } from "./repositories/reconciliation-item.repository";
import { MongoReconciliationItemRepository } from "./repositories/reconciliation-item.repository.mongo";
import { RequisitionRepository } from "./repositories/requisition.repository";
import { MongoRequisitionRepository } from "./repositories/requisition.repository.mongo";
import { RequisitionItemRepository } from "./repositories/requisition-item.repository";
import { MongoRequisitionItemRepository } from "./repositories/requisition-item.repository.mongo";
import { RubberBondingAgentRepository } from "./repositories/rubber-bonding-agent.repository";
import { MongoRubberBondingAgentRepository } from "./repositories/rubber-bonding-agent.repository.mongo";
import { RubberCuttingTrainingRepository } from "./repositories/rubber-cutting-training.repository";
import { MongoRubberCuttingTrainingRepository } from "./repositories/rubber-cutting-training.repository.mongo";
import { RubberDimensionOverrideRepository } from "./repositories/rubber-dimension-override.repository";
import { MongoRubberDimensionOverrideRepository } from "./repositories/rubber-dimension-override.repository.mongo";
import { RubberPriceListItemRepository } from "./repositories/rubber-price-list-item.repository";
import { MongoRubberPriceListItemRepository } from "./repositories/rubber-price-list-item.repository.mongo";
import { StaffMemberRepository } from "./repositories/staff-member.repository";
import { MongoStaffMemberRepository } from "./repositories/staff-member.repository.mongo";
import { StaffSignatureRepository } from "./repositories/staff-signature.repository";
import { MongoStaffSignatureRepository } from "./repositories/staff-signature.repository.mongo";
import { StockAllocationRepository } from "./repositories/stock-allocation.repository";
import { MongoStockAllocationRepository } from "./repositories/stock-allocation.repository.mongo";
import { StockControlActionPermissionRepository } from "./repositories/stock-control-action-permission.repository";
import { MongoStockControlActionPermissionRepository } from "./repositories/stock-control-action-permission.repository.mongo";
import { StockControlAdminTransferRepository } from "./repositories/stock-control-admin-transfer.repository";
import { MongoStockControlAdminTransferRepository } from "./repositories/stock-control-admin-transfer.repository.mongo";
import { StockControlCompanyRepository } from "./repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "./repositories/stock-control-company.repository.mongo";
import { StockControlCompanyRoleRepository } from "./repositories/stock-control-company-role.repository";
import { MongoStockControlCompanyRoleRepository } from "./repositories/stock-control-company-role.repository.mongo";
import { StockControlDepartmentRepository } from "./repositories/stock-control-department.repository";
import { MongoStockControlDepartmentRepository } from "./repositories/stock-control-department.repository.mongo";
import { StockControlInvitationRepository } from "./repositories/stock-control-invitation.repository";
import { MongoStockControlInvitationRepository } from "./repositories/stock-control-invitation.repository.mongo";
import { StockControlLocationRepository } from "./repositories/stock-control-location.repository";
import { MongoStockControlLocationRepository } from "./repositories/stock-control-location.repository.mongo";
import { StockControlProfileRepository } from "./repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "./repositories/stock-control-profile.repository.mongo";
import { StockControlRbacConfigRepository } from "./repositories/stock-control-rbac-config.repository";
import { MongoStockControlRbacConfigRepository } from "./repositories/stock-control-rbac-config.repository.mongo";
import { StockControlSupplierRepository } from "./repositories/stock-control-supplier.repository";
import { MongoStockControlSupplierRepository } from "./repositories/stock-control-supplier.repository.mongo";
import { StockControlUserRepository } from "./repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "./repositories/stock-control-user.repository.mongo";
import { StockIssuanceRepository } from "./repositories/stock-issuance.repository";
import { MongoStockIssuanceRepository } from "./repositories/stock-issuance.repository.mongo";
import { StockItemRepository } from "./repositories/stock-item.repository";
import { MongoStockItemRepository } from "./repositories/stock-item.repository.mongo";
import { StockMovementRepository } from "./repositories/stock-movement.repository";
import { MongoStockMovementRepository } from "./repositories/stock-movement.repository.mongo";
import { StockPriceHistoryRepository } from "./repositories/stock-price-history.repository";
import { MongoStockPriceHistoryRepository } from "./repositories/stock-price-history.repository.mongo";
import { StockReturnRepository } from "./repositories/stock-return.repository";
import { MongoStockReturnRepository } from "./repositories/stock-return.repository.mongo";
import { SupplierCertificateRepository } from "./repositories/supplier-certificate.repository";
import { MongoSupplierCertificateRepository } from "./repositories/supplier-certificate.repository.mongo";
import { SupplierDocumentRepository } from "./repositories/supplier-document.repository";
import { MongoSupplierDocumentRepository } from "./repositories/supplier-document.repository.mongo";
import { SupplierInvoiceRepository } from "./repositories/supplier-invoice.repository";
import { MongoSupplierInvoiceRepository } from "./repositories/supplier-invoice.repository.mongo";
import { SupplierInvoiceItemRepository } from "./repositories/supplier-invoice-item.repository";
import { MongoSupplierInvoiceItemRepository } from "./repositories/supplier-invoice-item.repository.mongo";
import { UserLocationAssignmentRepository } from "./repositories/user-location-assignment.repository";
import { MongoUserLocationAssignmentRepository } from "./repositories/user-location-assignment.repository.mongo";
import { WorkflowNotificationRepository } from "./repositories/workflow-notification.repository";
import { MongoWorkflowNotificationRepository } from "./repositories/workflow-notification.repository.mongo";
import { WorkflowNotificationRecipientRepository } from "./repositories/workflow-notification-recipient.repository";
import { MongoWorkflowNotificationRecipientRepository } from "./repositories/workflow-notification-recipient.repository.mongo";
import { WorkflowStepAssignmentRepository } from "./repositories/workflow-step-assignment.repository";
import { MongoWorkflowStepAssignmentRepository } from "./repositories/workflow-step-assignment.repository.mongo";
import { WorkflowStepConfigRepository } from "./repositories/workflow-step-config.repository";
import { MongoWorkflowStepConfigRepository } from "./repositories/workflow-step-config.repository.mongo";
import { ChatConversationSchema } from "./schemas/chat-conversation.schema";
import { ChatConversationParticipantSchema } from "./schemas/chat-conversation-participant.schema";
import { ChatMessageSchema } from "./schemas/chat-message.schema";
import { CpoCalloffRecordSchema } from "./schemas/cpo-calloff-record.schema";
import { CustomerPurchaseOrderSchema } from "./schemas/customer-purchase-order.schema";
import { CustomerPurchaseOrderItemSchema } from "./schemas/customer-purchase-order-item.schema";
import { DashboardPreferenceSchema } from "./schemas/dashboard-preference.schema";
import { DeliveryNoteSchema } from "./schemas/delivery-note.schema";
import { DeliveryNoteItemSchema } from "./schemas/delivery-note-item.schema";
import { DispatchCdnSchema } from "./schemas/dispatch-cdn.schema";
import { DispatchLoadPhotoSchema } from "./schemas/dispatch-load-photo.schema";
import { DispatchScanSchema } from "./schemas/dispatch-scan.schema";
import { DnExtractionCorrectionSchema } from "./schemas/dn-extraction-correction.schema";
import { GlossaryTermSchema } from "./schemas/glossary-term.schema";
import { InspectionBookingSchema } from "./schemas/inspection-booking.schema";
import { InvoiceClarificationSchema } from "./schemas/invoice-clarification.schema";
import { InvoiceExtractionCorrectionSchema } from "./schemas/invoice-extraction-correction.schema";
import { IssuanceBatchRecordSchema } from "./schemas/issuance-batch-record.schema";
import { IssuanceSessionSchema } from "./schemas/issuance-session.schema";
import { JobCardSchema } from "./schemas/job-card.schema";
import { JobCardActionCompletionSchema } from "./schemas/job-card-action-completion.schema";
import { JobCardApprovalSchema } from "./schemas/job-card-approval.schema";
import { JobCardAttachmentSchema } from "./schemas/job-card-attachment.schema";
import { JobCardBackgroundCompletionSchema } from "./schemas/job-card-background-completion.schema";
import { JobCardCoatingAnalysisSchema } from "./schemas/job-card-coating-analysis.schema";
import { JobCardDataBookSchema } from "./schemas/job-card-data-book.schema";
import { JobCardDocumentSchema } from "./schemas/job-card-document.schema";
import { JobCardExtractionCorrectionSchema } from "./schemas/job-card-extraction-correction.schema";
import { JobCardImportJobSchema } from "./schemas/job-card-import-job.schema";
import { JobCardImportMappingSchema } from "./schemas/job-card-import-mapping.schema";
import { JobCardJobFileSchema } from "./schemas/job-card-job-file.schema";
import { JobCardLineItemSchema } from "./schemas/job-card-line-item.schema";
import { JobCardVersionSchema } from "./schemas/job-card-version.schema";
import { PushSubscriptionSchema } from "./schemas/push-subscription.schema";
import { QaReviewDecisionSchema } from "./schemas/qa-review-decision.schema";
import { ReconciliationDocumentSchema } from "./schemas/reconciliation-document.schema";
import { ReconciliationEventSchema } from "./schemas/reconciliation-event.schema";
import { ReconciliationItemSchema } from "./schemas/reconciliation-item.schema";
import { RequisitionSchema } from "./schemas/requisition.schema";
import { RequisitionItemSchema } from "./schemas/requisition-item.schema";
import { RubberBondingAgentSchema } from "./schemas/rubber-bonding-agent.schema";
import { RubberCuttingTrainingSchema } from "./schemas/rubber-cutting-training.schema";
import { RubberDimensionOverrideSchema } from "./schemas/rubber-dimension-override.schema";
import { RubberPriceListItemSchema } from "./schemas/rubber-price-list-item.schema";
import { StaffMemberSchema } from "./schemas/staff-member.schema";
import { StaffSignatureSchema } from "./schemas/staff-signature.schema";
import { StockAllocationSchema } from "./schemas/stock-allocation.schema";
import { StockControlActionPermissionSchema } from "./schemas/stock-control-action-permission.schema";
import { StockControlAdminTransferSchema } from "./schemas/stock-control-admin-transfer.schema";
import { StockControlCompanySchema } from "./schemas/stock-control-company.schema";
import { StockControlCompanyRoleSchema } from "./schemas/stock-control-company-role.schema";
import { StockControlDepartmentSchema } from "./schemas/stock-control-department.schema";
import { StockControlInvitationSchema } from "./schemas/stock-control-invitation.schema";
import { StockControlLocationSchema } from "./schemas/stock-control-location.schema";
import { StockControlProfileSchema } from "./schemas/stock-control-profile.schema";
import { StockControlRbacConfigSchema } from "./schemas/stock-control-rbac-config.schema";
import { StockControlSupplierSchema } from "./schemas/stock-control-supplier.schema";
import { StockControlUserSchema } from "./schemas/stock-control-user.schema";
import { StockIssuanceSchema } from "./schemas/stock-issuance.schema";
import { StockItemSchema } from "./schemas/stock-item.schema";
import { StockMovementSchema } from "./schemas/stock-movement.schema";
import { StockPriceHistorySchema } from "./schemas/stock-price-history.schema";
import { StockReturnSchema } from "./schemas/stock-return.schema";
import { SupplierCertificateSchema } from "./schemas/supplier-certificate.schema";
import { SupplierDocumentSchema } from "./schemas/supplier-document.schema";
import { SupplierInvoiceSchema } from "./schemas/supplier-invoice.schema";
import { SupplierInvoiceItemSchema } from "./schemas/supplier-invoice-item.schema";
import { UserLocationAssignmentSchema } from "./schemas/user-location-assignment.schema";
import { WorkflowNotificationSchema } from "./schemas/workflow-notification.schema";
import { WorkflowNotificationRecipientSchema } from "./schemas/workflow-notification-recipient.schema";
import { WorkflowStepAssignmentSchema } from "./schemas/workflow-step-assignment.schema";
import { WorkflowStepConfigSchema } from "./schemas/workflow-step-config.schema";
import { ActionPermissionService } from "./services/action-permission.service";
import { AscaQuoteDocumentsProfileHandler } from "./services/asca-quote-documents-profile.handler";
import { StockControlAuthService } from "./services/auth.service";
import { BackgroundStepService } from "./services/background-step.service";
import { BrandingScraperService } from "./services/branding-scraper.service";
import { CertificateService } from "./services/certificate.service";
import { CertificateAnalysisService } from "./services/certificate-analysis.service";
import { ChatService } from "./services/chat.service";
import { CoatingAnalysisService } from "./services/coating-analysis.service";
import { CompanyEmailService } from "./services/company-email.service";
import { CompanyRoleService } from "./services/company-role.service";
import { CpoService } from "./services/cpo.service";
import { DashboardService } from "./services/dashboard.service";
import { DataBookPdfService } from "./services/data-book-pdf.service";
import { DeliveryService } from "./services/delivery.service";
import { DeliveryExtractionService } from "./services/delivery-extraction.service";
import { DeliveryInvoiceService } from "./services/delivery-invoice.service";
import { DeliverySupplierService } from "./services/delivery-supplier.service";
import { DispatchService } from "./services/dispatch.service";
import { DispatchCdnService } from "./services/dispatch-cdn.service";
import { DispatchLoadPhotoService } from "./services/dispatch-load-photo.service";
import { DrawingExtractionService } from "./services/drawing-extraction.service";
import { GlossaryService } from "./services/glossary.service";
import { ImportService } from "./services/import.service";
import { InspectionBookingService } from "./services/inspection-booking.service";
import { InventoryService } from "./services/inventory.service";
import { StockControlInvitationService } from "./services/invitation.service";
import { InvoiceService } from "./services/invoice.service";
import { InvoiceExtractionService } from "./services/invoice-extraction.service";
import { ItemIdentificationService } from "./services/item-identification.service";
import { JobCardService } from "./services/job-card.service";
import { JobCardAllocationService } from "./services/job-card-allocation.service";
import { JobCardImportService } from "./services/job-card-import.service";
import { JobCardImportJobService } from "./services/job-card-import-job.service";
import { JobCardPdfService } from "./services/job-card-pdf.service";
import { JobCardVersionService } from "./services/job-card-version.service";
import { JobCardWorkflowService } from "./services/job-card-workflow.service";
import { JobFileService } from "./services/job-file.service";
import { LookupService } from "./services/lookup.service";
import { M2CalculationService } from "./services/m2-calculation.service";
import { MovementService } from "./services/movement.service";
import { PriceHistoryService } from "./services/price-history.service";
import { PublicBrandingService } from "./services/public-branding.service";
import { QaProcessService } from "./services/qa-process.service";
import { QrCodeService } from "./services/qr-code.service";
import { RbacConfigService } from "./services/rbac-config.service";
import { ReconciliationService } from "./services/reconciliation.service";
import { ReconciliationDocumentService } from "./services/reconciliation-document.service";
import { ReconciliationExtractionService } from "./services/reconciliation-extraction.service";
import { ReportsService } from "./services/reports.service";
import { RequisitionService } from "./services/requisition.service";
import { RubberBondingAgentService } from "./services/rubber-bonding-agent.service";
import { RubberCuttingTrainingService } from "./services/rubber-cutting-training.service";
import { RubberPriceListService } from "./services/rubber-price-list.service";
import { RubberPriceListExtractionService } from "./services/rubber-price-list-extraction.service";
import { RubberPricingService } from "./services/rubber-pricing.service";
import { SageInvoiceAdapterService } from "./services/sage-invoice-adapter.service";
import { SageJcDumpService } from "./services/sage-jc-dump.service";
import { ScEmailAdapterService } from "./services/sc-email-adapter.service";
import { SearchService } from "./services/search.service";
import { SignatureService } from "./services/signature.service";
import { StaffService } from "./services/staff.service";
import { StockAllocationService } from "./services/stock-allocation.service";
import { StockTakeReconciliationService } from "./services/stock-take-reconciliation.service";
import { SupplierDocumentService } from "./services/supplier-document.service";
import { WebPushService } from "./services/web-push.service";
import { WorkflowAssignmentService } from "./services/workflow-assignment.service";
import { WorkflowNotificationService } from "./services/workflow-notification.service";
import { WorkflowStepConfigService } from "./services/workflow-step-config.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "ChatConversation", schema: ChatConversationSchema },
      {
        name: "ChatConversationParticipant",
        schema: ChatConversationParticipantSchema,
      },
      { name: "ChatMessage", schema: ChatMessageSchema },
      { name: "JobCardCoatingAnalysis", schema: JobCardCoatingAnalysisSchema },
      { name: "RubberPriceListItem", schema: RubberPriceListItemSchema },
      { name: "RubberBondingAgent", schema: RubberBondingAgentSchema },
      { name: "CpoCalloffRecord", schema: CpoCalloffRecordSchema },
      {
        name: "CustomerPurchaseOrderItem",
        schema: CustomerPurchaseOrderItemSchema,
      },
      { name: "CustomerPurchaseOrder", schema: CustomerPurchaseOrderSchema },
      { name: "DashboardPreference", schema: DashboardPreferenceSchema },
      { name: "DeliveryNoteItem", schema: DeliveryNoteItemSchema },
      { name: "DeliveryNote", schema: DeliveryNoteSchema },
      { name: "DispatchCdn", schema: DispatchCdnSchema },
      { name: "DispatchLoadPhoto", schema: DispatchLoadPhotoSchema },
      { name: "DispatchScan", schema: DispatchScanSchema },
      { name: "DnExtractionCorrection", schema: DnExtractionCorrectionSchema },
      { name: "GlossaryTerm", schema: GlossaryTermSchema },
      { name: "InspectionBooking", schema: InspectionBookingSchema },
      { name: "InvoiceClarification", schema: InvoiceClarificationSchema },
      {
        name: "InvoiceExtractionCorrection",
        schema: InvoiceExtractionCorrectionSchema,
      },
      { name: "IssuanceBatchRecord", schema: IssuanceBatchRecordSchema },
      { name: "IssuanceSession", schema: IssuanceSessionSchema },
      {
        name: "JobCardActionCompletion",
        schema: JobCardActionCompletionSchema,
      },
      { name: "JobCardApproval", schema: JobCardApprovalSchema },
      { name: "JobCardAttachment", schema: JobCardAttachmentSchema },
      { name: "JobCard", schema: JobCardSchema },
      {
        name: "JobCardBackgroundCompletion",
        schema: JobCardBackgroundCompletionSchema,
      },
      { name: "JobCardDataBook", schema: JobCardDataBookSchema },
      { name: "JobCardDocument", schema: JobCardDocumentSchema },
      {
        name: "JobCardExtractionCorrection",
        schema: JobCardExtractionCorrectionSchema,
      },
      { name: "JobCardImportJob", schema: JobCardImportJobSchema },
      { name: "JobCardImportMapping", schema: JobCardImportMappingSchema },
      { name: "JobCardJobFile", schema: JobCardJobFileSchema },
      { name: "JobCardLineItem", schema: JobCardLineItemSchema },
      { name: "JobCardVersion", schema: JobCardVersionSchema },
      { name: "PushSubscription", schema: PushSubscriptionSchema },
      { name: "QaReviewDecision", schema: QaReviewDecisionSchema },
      { name: "ReconciliationDocument", schema: ReconciliationDocumentSchema },
      { name: "ReconciliationEvent", schema: ReconciliationEventSchema },
      { name: "ReconciliationItem", schema: ReconciliationItemSchema },
      { name: "Requisition", schema: RequisitionSchema },
      { name: "RequisitionItem", schema: RequisitionItemSchema },
      { name: "RubberCuttingTraining", schema: RubberCuttingTrainingSchema },
      { name: "RubberDimensionOverride", schema: RubberDimensionOverrideSchema },
      { name: "StaffMember", schema: StaffMemberSchema },
      { name: "StaffSignature", schema: StaffSignatureSchema },
      { name: "StockAllocation", schema: StockAllocationSchema },
      {
        name: "StockControlActionPermission",
        schema: StockControlActionPermissionSchema,
      },
      {
        name: "StockControlAdminTransfer",
        schema: StockControlAdminTransferSchema,
      },
      { name: "StockControlCompany", schema: StockControlCompanySchema },
      {
        name: "StockControlCompanyRole",
        schema: StockControlCompanyRoleSchema,
      },
      { name: "StockControlDepartment", schema: StockControlDepartmentSchema },
      { name: "StockControlInvitation", schema: StockControlInvitationSchema },
      { name: "StockControlLocation", schema: StockControlLocationSchema },
      { name: "StockControlProfile", schema: StockControlProfileSchema },
      { name: "StockControlRbacConfig", schema: StockControlRbacConfigSchema },
      { name: "StockControlSupplier", schema: StockControlSupplierSchema },
      { name: "StockControlUser", schema: StockControlUserSchema },
      { name: "StockIssuance", schema: StockIssuanceSchema },
      { name: "StockItem", schema: StockItemSchema },
      { name: "StockMovement", schema: StockMovementSchema },
      { name: "StockPriceHistory", schema: StockPriceHistorySchema },
      { name: "StockReturn", schema: StockReturnSchema },
      { name: "SupplierCertificate", schema: SupplierCertificateSchema },
      { name: "SupplierDocument", schema: SupplierDocumentSchema },
      { name: "SupplierInvoice", schema: SupplierInvoiceSchema },
      { name: "SupplierInvoiceItem", schema: SupplierInvoiceItemSchema },
      { name: "UserLocationAssignment", schema: UserLocationAssignmentSchema },
      { name: "WorkflowNotification", schema: WorkflowNotificationSchema },
      {
        name: "WorkflowNotificationRecipient",
        schema: WorkflowNotificationRecipientSchema,
      },
      { name: "WorkflowStepAssignment", schema: WorkflowStepAssignmentSchema },
      { name: "WorkflowStepConfig", schema: WorkflowStepConfigSchema },
      { name: "User", schema: UserSchema },
      { name: "App", schema: AppSchema },
      { name: "UserAppAccess", schema: UserAppAccessSchema },
      { name: "CalibrationCertificate", schema: CalibrationCertificateSchema },
      { name: "QcBatchAssignment", schema: QcBatchAssignmentSchema },
      { name: "QcBlastProfile", schema: QcBlastProfileSchema },
      { name: "QcControlPlan", schema: QcControlPlanSchema },
      { name: "QcDefelskoBatch", schema: QcDefelskoBatchSchema },
      { name: "QcDftReading", schema: QcDftReadingSchema },
      { name: "QcDustDebrisTest", schema: QcDustDebrisTestSchema },
      { name: "QcItemsRelease", schema: QcItemsReleaseSchema },
      { name: "QcPullTest", schema: QcPullTestSchema },
      { name: "QcReleaseCertificate", schema: QcReleaseCertificateSchema },
      { name: "QcShoreHardness", schema: QcShoreHardnessSchema },
    ]),
    AdminModule,
    CoatingSpecificationModule,
    EmailModule,
    FlangeDimensionModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: "8h" },
      }),
    }),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    PaintPricingModule,
    QcModule,
    NixModule,
    MetricsModule,
    NbOdLookupModule,
    PipeScheduleModule,
    RubberLiningModule,
    SageExportModule,
    SharedModule,
    StaffLeaveModule,
    StockManagementModule,
    StorageModule,
  ],
  controllers: [
    StockControlAuthController,
    PublicBrandingController,
    InspectionPublicController,
    InventoryController,
    JobCardsController,
    DeliveriesController,
    MovementsController,
    ImportController,
    StockTakeReconciliationController,
    JobCardImportController,
    DashboardController,
    ReportsController,
    InvitationController,
    QrCodeController,
    RequisitionsController,
    SearchController,
    StaffController,
    WorkflowController,
    SignatureController,
    InvoicesController,
    RubberPricingController,
    RubberBondingAgentController,
    SupplierController,
    CpoController,
    GlossaryController,
    CertificateController,
    SupplierDocumentController,
    ChatController,
    ReconciliationController,
    StockControlCustomersController,
  ],
  providers: [
    StockControlAuthGuard,
    StockControlRoleGuard,
    StockControlOnboardingGuard,
    MessagingEnabledGuard,
    StockControlAuthService,
    PublicBrandingService,
    BrandingScraperService,
    StockControlInvitationService,
    InventoryService,
    JobCardService,
    JobCardAllocationService,
    DeliverySupplierService,
    DeliveryExtractionService,
    DeliveryInvoiceService,
    DeliveryService,
    MovementService,
    ImportService,
    StockTakeReconciliationService,
    JobCardImportService,
    JobCardImportJobService,
    M2CalculationService,
    CoatingAnalysisService,
    RubberPricingService,
    RubberPriceListService,
    RubberPriceListExtractionService,
    RubberBondingAgentService,
    CompanyEmailService,
    DashboardService,
    QrCodeService,
    ReportsService,
    RequisitionService,
    StaffService,
    ItemIdentificationService,
    LookupService,
    SignatureService,
    WebPushService,
    WorkflowAssignmentService,
    WorkflowNotificationService,
    JobCardWorkflowService,
    DispatchService,
    DispatchCdnService,
    DispatchLoadPhotoService,
    JobCardPdfService,
    JobCardVersionService,
    DrawingExtractionService,
    InvoiceExtractionService,
    InvoiceService,
    PriceHistoryService,
    CompanyRoleService,
    ActionPermissionService,
    RbacConfigService,
    SageInvoiceAdapterService,
    SearchService,
    CpoService,
    GlossaryService,
    CertificateService,
    CertificateAnalysisService,
    SupplierDocumentService,
    DataBookPdfService,
    ChatService,
    WorkflowStepConfigService,
    BackgroundStepService,
    QaProcessService,
    InspectionBookingService,
    ScEmailAdapterService,
    JobFileService,
    ReconciliationDocumentService,
    ReconciliationExtractionService,
    ReconciliationService,
    RubberCuttingTrainingService,
    StockAllocationService,
    SageJcDumpService,
    AscaQuoteDocumentsProfileHandler,
    StockControlCapabilities,
    repositoryProvider(ChatConversationRepository, MongoChatConversationRepository),
    repositoryProvider(
      ChatConversationParticipantRepository,
      MongoChatConversationParticipantRepository,
    ),
    repositoryProvider(ChatMessageRepository, MongoChatMessageRepository),
    repositoryProvider(JobCardCoatingAnalysisRepository, MongoJobCardCoatingAnalysisRepository),
    repositoryProvider(RubberPriceListItemRepository, MongoRubberPriceListItemRepository),
    repositoryProvider(RubberBondingAgentRepository, MongoRubberBondingAgentRepository),
    repositoryProvider(CpoCalloffRecordRepository, MongoCpoCalloffRecordRepository),
    repositoryProvider(
      CustomerPurchaseOrderItemRepository,
      MongoCustomerPurchaseOrderItemRepository,
    ),
    repositoryProvider(CustomerPurchaseOrderRepository, MongoCustomerPurchaseOrderRepository),
    repositoryProvider(DashboardPreferenceRepository, MongoDashboardPreferenceRepository),
    repositoryProvider(DeliveryNoteItemRepository, MongoDeliveryNoteItemRepository),
    repositoryProvider(DeliveryNoteRepository, MongoDeliveryNoteRepository),
    repositoryProvider(DispatchCdnRepository, MongoDispatchCdnRepository),
    repositoryProvider(DispatchLoadPhotoRepository, MongoDispatchLoadPhotoRepository),
    repositoryProvider(DispatchScanRepository, MongoDispatchScanRepository),
    repositoryProvider(DnExtractionCorrectionRepository, MongoDnExtractionCorrectionRepository),
    repositoryProvider(GlossaryTermRepository, MongoGlossaryTermRepository),
    repositoryProvider(InspectionBookingRepository, MongoInspectionBookingRepository),
    repositoryProvider(InvoiceClarificationRepository, MongoInvoiceClarificationRepository),
    repositoryProvider(
      InvoiceExtractionCorrectionRepository,
      MongoInvoiceExtractionCorrectionRepository,
    ),
    repositoryProvider(IssuanceBatchRecordRepository, MongoIssuanceBatchRecordRepository),
    repositoryProvider(IssuanceSessionRepository, MongoIssuanceSessionRepository),
    repositoryProvider(JobCardActionCompletionRepository, MongoJobCardActionCompletionRepository),
    repositoryProvider(JobCardApprovalRepository, MongoJobCardApprovalRepository),
    repositoryProvider(JobCardAttachmentRepository, MongoJobCardAttachmentRepository),
    repositoryProvider(JobCardRepository, MongoJobCardRepository),
    repositoryProvider(
      JobCardBackgroundCompletionRepository,
      MongoJobCardBackgroundCompletionRepository,
    ),
    repositoryProvider(JobCardDataBookRepository, MongoJobCardDataBookRepository),
    repositoryProvider(JobCardDocumentRepository, MongoJobCardDocumentRepository),
    repositoryProvider(
      JobCardExtractionCorrectionRepository,
      MongoJobCardExtractionCorrectionRepository,
    ),
    repositoryProvider(JobCardImportJobRepository, MongoJobCardImportJobRepository),
    repositoryProvider(JobCardImportMappingRepository, MongoJobCardImportMappingRepository),
    repositoryProvider(JobCardJobFileRepository, MongoJobCardJobFileRepository),
    repositoryProvider(JobCardLineItemRepository, MongoJobCardLineItemRepository),
    repositoryProvider(JobCardVersionRepository, MongoJobCardVersionRepository),
    repositoryProvider(PushSubscriptionRepository, MongoPushSubscriptionRepository),
    repositoryProvider(QaReviewDecisionRepository, MongoQaReviewDecisionRepository),
    repositoryProvider(ReconciliationDocumentRepository, MongoReconciliationDocumentRepository),
    repositoryProvider(ReconciliationEventRepository, MongoReconciliationEventRepository),
    repositoryProvider(ReconciliationItemRepository, MongoReconciliationItemRepository),
    repositoryProvider(RequisitionRepository, MongoRequisitionRepository),
    repositoryProvider(RequisitionItemRepository, MongoRequisitionItemRepository),
    repositoryProvider(RubberCuttingTrainingRepository, MongoRubberCuttingTrainingRepository),
    repositoryProvider(RubberDimensionOverrideRepository, MongoRubberDimensionOverrideRepository),
    repositoryProvider(StaffMemberRepository, MongoStaffMemberRepository),
    repositoryProvider(StaffSignatureRepository, MongoStaffSignatureRepository),
    repositoryProvider(StockAllocationRepository, MongoStockAllocationRepository),
    repositoryProvider(
      StockControlActionPermissionRepository,
      MongoStockControlActionPermissionRepository,
    ),
    repositoryProvider(
      StockControlAdminTransferRepository,
      MongoStockControlAdminTransferRepository,
    ),
    repositoryProvider(StockControlCompanyRepository, MongoStockControlCompanyRepository),
    repositoryProvider(StockControlCompanyRoleRepository, MongoStockControlCompanyRoleRepository),
    repositoryProvider(StockControlDepartmentRepository, MongoStockControlDepartmentRepository),
    repositoryProvider(StockControlInvitationRepository, MongoStockControlInvitationRepository),
    repositoryProvider(StockControlLocationRepository, MongoStockControlLocationRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(StockControlRbacConfigRepository, MongoStockControlRbacConfigRepository),
    repositoryProvider(StockControlSupplierRepository, MongoStockControlSupplierRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
    repositoryProvider(StockIssuanceRepository, MongoStockIssuanceRepository),
    repositoryProvider(StockItemRepository, MongoStockItemRepository),
    repositoryProvider(StockMovementRepository, MongoStockMovementRepository),
    repositoryProvider(StockPriceHistoryRepository, MongoStockPriceHistoryRepository),
    repositoryProvider(StockReturnRepository, MongoStockReturnRepository),
    repositoryProvider(SupplierCertificateRepository, MongoSupplierCertificateRepository),
    repositoryProvider(SupplierDocumentRepository, MongoSupplierDocumentRepository),
    repositoryProvider(SupplierInvoiceRepository, MongoSupplierInvoiceRepository),
    repositoryProvider(SupplierInvoiceItemRepository, MongoSupplierInvoiceItemRepository),
    repositoryProvider(UserLocationAssignmentRepository, MongoUserLocationAssignmentRepository),
    repositoryProvider(WorkflowNotificationRepository, MongoWorkflowNotificationRepository),
    repositoryProvider(
      WorkflowNotificationRecipientRepository,
      MongoWorkflowNotificationRecipientRepository,
    ),
    repositoryProvider(WorkflowStepAssignmentRepository, MongoWorkflowStepAssignmentRepository),
    repositoryProvider(WorkflowStepConfigRepository, MongoWorkflowStepConfigRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(AppRepository, MongoAppRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
    repositoryProvider(CalibrationCertificateRepository, MongoCalibrationCertificateRepository),
    repositoryProvider(QcBatchAssignmentRepository, MongoQcBatchAssignmentRepository),
    repositoryProvider(QcBlastProfileRepository, MongoQcBlastProfileRepository),
    repositoryProvider(QcControlPlanRepository, MongoQcControlPlanRepository),
    repositoryProvider(QcDefelskoBatchRepository, MongoQcDefelskoBatchRepository),
    repositoryProvider(QcDftReadingRepository, MongoQcDftReadingRepository),
    repositoryProvider(QcDustDebrisTestRepository, MongoQcDustDebrisTestRepository),
    repositoryProvider(QcItemsReleaseRepository, MongoQcItemsReleaseRepository),
    repositoryProvider(QcPullTestRepository, MongoQcPullTestRepository),
    repositoryProvider(QcReleaseCertificateRepository, MongoQcReleaseCertificateRepository),
    repositoryProvider(QcShoreHardnessRepository, MongoQcShoreHardnessRepository),
  ],
  exports: [StockControlAuthService],
})
export class StockControlModule {}
