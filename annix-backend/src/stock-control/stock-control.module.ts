import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { FlangeDimensionModule } from "../flange-dimension/flange-dimension.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NbOdLookupModule } from "../nb-od-lookup/nb-od-lookup.module";
import { NixLearning } from "../nix/entities/nix-learning.entity";
import { NixModule } from "../nix/nix.module";
import { NixLearningRepository } from "../nix/nix-learning.repository";
import { MongoNixLearningRepository } from "../nix/nix-learning.repository.mongo";
import { PostgresNixLearningRepository } from "../nix/nix-learning.repository.postgres";
import { NixLearningSchema } from "../nix/schemas/nix-learning.schema";
import { PipeScheduleModule } from "../pipe-schedule/pipe-schedule.module";
import { CompanyRepository } from "../platform/company.repository";
import { MongoCompanyRepository } from "../platform/company.repository.mongo";
import { PostgresCompanyRepository } from "../platform/company.repository.postgres";
import { Company } from "../platform/entities/company.entity";
import { CompanySchema } from "../platform/schemas/company.schema";
import { RubberProductCoding } from "../rubber-lining/entities/rubber-product-coding.entity";
import { RubberRollStock } from "../rubber-lining/entities/rubber-roll-stock.entity";
import { RubberRollStockRepository } from "../rubber-lining/repositories/rubber-roll-stock.repository";
import { MongoRubberRollStockRepository } from "../rubber-lining/repositories/rubber-roll-stock.repository.mongo";
import { PostgresRubberRollStockRepository } from "../rubber-lining/repositories/rubber-roll-stock.repository.postgres";
import { RubberLiningModule } from "../rubber-lining/rubber-lining.module";
import { RubberRollStockSchema } from "../rubber-lining/schemas/rubber-roll-stock.schema";
import { SageExportModule } from "../sage-export/sage-export.module";
import { SharedModule } from "../shared/shared.module";
import { StaffLeaveModule } from "../staff-leave/staff-leave.module";
import { StorageModule } from "../storage/storage.module";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
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
import { SearchController } from "./controllers/search.controller";
import { SignatureController } from "./controllers/signature.controller";
import { StaffController } from "./controllers/staff.controller";
import { StockTakeReconciliationController } from "./controllers/stock-take-reconciliation.controller";
import { SupplierController } from "./controllers/supplier.controller";
import { SupplierDocumentController } from "./controllers/supplier-document.controller";
import { WorkflowController } from "./controllers/workflow.controller";
import { ChatConversation } from "./entities/chat-conversation.entity";
import { ChatConversationParticipant } from "./entities/chat-conversation-participant.entity";
import { ChatMessage } from "./entities/chat-message.entity";
import { JobCardCoatingAnalysis } from "./entities/coating-analysis.entity";
import { CpoCalloffRecord } from "./entities/cpo-calloff-record.entity";
import { CustomerPurchaseOrder } from "./entities/customer-purchase-order.entity";
import { CustomerPurchaseOrderItem } from "./entities/customer-purchase-order-item.entity";
import { DashboardPreference } from "./entities/dashboard-preference.entity";
import { DeliveryNote } from "./entities/delivery-note.entity";
import { DeliveryNoteItem } from "./entities/delivery-note-item.entity";
import { DispatchCdn } from "./entities/dispatch-cdn.entity";
import { DispatchLoadPhoto } from "./entities/dispatch-load-photo.entity";
import { DispatchScan } from "./entities/dispatch-scan.entity";
import { DnExtractionCorrection } from "./entities/dn-extraction-correction.entity";
import { GlossaryTerm } from "./entities/glossary-term.entity";
import { InspectionBooking } from "./entities/inspection-booking.entity";
import { InvoiceClarification } from "./entities/invoice-clarification.entity";
import { InvoiceExtractionCorrection } from "./entities/invoice-extraction-correction.entity";
import { IssuanceBatchRecord } from "./entities/issuance-batch-record.entity";
import { IssuanceSession } from "./entities/issuance-session.entity";
import { JobCard } from "./entities/job-card.entity";
import { JobCardActionCompletion } from "./entities/job-card-action-completion.entity";
import { JobCardApproval } from "./entities/job-card-approval.entity";
import { JobCardAttachment } from "./entities/job-card-attachment.entity";
import { JobCardBackgroundCompletion } from "./entities/job-card-background-completion.entity";
import { JobCardDataBook } from "./entities/job-card-data-book.entity";
import { JobCardDocument } from "./entities/job-card-document.entity";
import { JobCardExtractionCorrection } from "./entities/job-card-extraction-correction.entity";
import { JobCardImportMapping } from "./entities/job-card-import-mapping.entity";
import { JobCardJobFile } from "./entities/job-card-job-file.entity";
import { JobCardLineItem } from "./entities/job-card-line-item.entity";
import { JobCardVersion } from "./entities/job-card-version.entity";
import { PushSubscription } from "./entities/push-subscription.entity";
import { QaReviewDecision } from "./entities/qa-review-decision.entity";
import { ReconciliationDocument } from "./entities/reconciliation-document.entity";
import { ReconciliationEvent } from "./entities/reconciliation-event.entity";
import { ReconciliationItem } from "./entities/reconciliation-item.entity";
import { Requisition } from "./entities/requisition.entity";
import { RequisitionItem } from "./entities/requisition-item.entity";
import { RubberCuttingTraining } from "./entities/rubber-cutting-training.entity";
import { RubberDimensionOverride } from "./entities/rubber-dimension-override.entity";
import { StaffMember } from "./entities/staff-member.entity";
import { StaffSignature } from "./entities/staff-signature.entity";
import { StockAllocation } from "./entities/stock-allocation.entity";
import { StockControlActionPermission } from "./entities/stock-control-action-permission.entity";
import { StockControlAdminTransfer } from "./entities/stock-control-admin-transfer.entity";
import { StockControlCompany } from "./entities/stock-control-company.entity";
import { StockControlCompanyRole } from "./entities/stock-control-company-role.entity";
import { StockControlDepartment } from "./entities/stock-control-department.entity";
import { StockControlInvitation } from "./entities/stock-control-invitation.entity";
import { StockControlLocation } from "./entities/stock-control-location.entity";
import { StockControlProfile } from "./entities/stock-control-profile.entity";
import { StockControlRbacConfig } from "./entities/stock-control-rbac-config.entity";
import { StockControlSupplier } from "./entities/stock-control-supplier.entity";
import { StockControlUser } from "./entities/stock-control-user.entity";
import { StockIssuance } from "./entities/stock-issuance.entity";
import { StockItem } from "./entities/stock-item.entity";
import { StockMovement } from "./entities/stock-movement.entity";
import { StockPriceHistory } from "./entities/stock-price-history.entity";
import { StockReturn } from "./entities/stock-return.entity";
import { SupplierCertificate } from "./entities/supplier-certificate.entity";
import { SupplierDocument } from "./entities/supplier-document.entity";
import { SupplierInvoice } from "./entities/supplier-invoice.entity";
import { SupplierInvoiceItem } from "./entities/supplier-invoice-item.entity";
import { UserLocationAssignment } from "./entities/user-location-assignment.entity";
import { WorkflowNotification } from "./entities/workflow-notification.entity";
import { WorkflowNotificationRecipient } from "./entities/workflow-notification-recipient.entity";
import { WorkflowStepAssignment } from "./entities/workflow-step-assignment.entity";
import { WorkflowStepConfig } from "./entities/workflow-step-config.entity";
import { MessagingEnabledGuard } from "./guards/messaging-enabled.guard";
import { StockControlAuthGuard } from "./guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "./guards/stock-control-onboarding.guard";
import { StockControlRoleGuard } from "./guards/stock-control-role.guard";
import { CalibrationCertificate } from "./qc/entities/calibration-certificate.entity";
import { QcBatchAssignment } from "./qc/entities/qc-batch-assignment.entity";
import { QcBlastProfile } from "./qc/entities/qc-blast-profile.entity";
import { QcControlPlan } from "./qc/entities/qc-control-plan.entity";
import { QcDefelskoBatch } from "./qc/entities/qc-defelsko-batch.entity";
import { QcDftReading } from "./qc/entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "./qc/entities/qc-dust-debris-test.entity";
import { QcItemsRelease } from "./qc/entities/qc-items-release.entity";
import { QcPullTest } from "./qc/entities/qc-pull-test.entity";
import { QcReleaseCertificate } from "./qc/entities/qc-release-certificate.entity";
import { QcShoreHardness } from "./qc/entities/qc-shore-hardness.entity";
import { QcModule } from "./qc/qc.module";
import { CalibrationCertificateRepository } from "./qc/repositories/calibration-certificate.repository";
import { MongoCalibrationCertificateRepository } from "./qc/repositories/calibration-certificate.repository.mongo";
import { PostgresCalibrationCertificateRepository } from "./qc/repositories/calibration-certificate.repository.postgres";
import { QcBatchAssignmentRepository } from "./qc/repositories/qc-batch-assignment.repository";
import { MongoQcBatchAssignmentRepository } from "./qc/repositories/qc-batch-assignment.repository.mongo";
import { PostgresQcBatchAssignmentRepository } from "./qc/repositories/qc-batch-assignment.repository.postgres";
import { QcBlastProfileRepository } from "./qc/repositories/qc-blast-profile.repository";
import { MongoQcBlastProfileRepository } from "./qc/repositories/qc-blast-profile.repository.mongo";
import { PostgresQcBlastProfileRepository } from "./qc/repositories/qc-blast-profile.repository.postgres";
import { QcControlPlanRepository } from "./qc/repositories/qc-control-plan.repository";
import { MongoQcControlPlanRepository } from "./qc/repositories/qc-control-plan.repository.mongo";
import { PostgresQcControlPlanRepository } from "./qc/repositories/qc-control-plan.repository.postgres";
import { QcDefelskoBatchRepository } from "./qc/repositories/qc-defelsko-batch.repository";
import { MongoQcDefelskoBatchRepository } from "./qc/repositories/qc-defelsko-batch.repository.mongo";
import { PostgresQcDefelskoBatchRepository } from "./qc/repositories/qc-defelsko-batch.repository.postgres";
import { QcDftReadingRepository } from "./qc/repositories/qc-dft-reading.repository";
import { MongoQcDftReadingRepository } from "./qc/repositories/qc-dft-reading.repository.mongo";
import { PostgresQcDftReadingRepository } from "./qc/repositories/qc-dft-reading.repository.postgres";
import { QcDustDebrisTestRepository } from "./qc/repositories/qc-dust-debris-test.repository";
import { MongoQcDustDebrisTestRepository } from "./qc/repositories/qc-dust-debris-test.repository.mongo";
import { PostgresQcDustDebrisTestRepository } from "./qc/repositories/qc-dust-debris-test.repository.postgres";
import { QcItemsReleaseRepository } from "./qc/repositories/qc-items-release.repository";
import { MongoQcItemsReleaseRepository } from "./qc/repositories/qc-items-release.repository.mongo";
import { PostgresQcItemsReleaseRepository } from "./qc/repositories/qc-items-release.repository.postgres";
import { QcPullTestRepository } from "./qc/repositories/qc-pull-test.repository";
import { MongoQcPullTestRepository } from "./qc/repositories/qc-pull-test.repository.mongo";
import { PostgresQcPullTestRepository } from "./qc/repositories/qc-pull-test.repository.postgres";
import { QcReleaseCertificateRepository } from "./qc/repositories/qc-release-certificate.repository";
import { MongoQcReleaseCertificateRepository } from "./qc/repositories/qc-release-certificate.repository.mongo";
import { PostgresQcReleaseCertificateRepository } from "./qc/repositories/qc-release-certificate.repository.postgres";
import { QcShoreHardnessRepository } from "./qc/repositories/qc-shore-hardness.repository";
import { MongoQcShoreHardnessRepository } from "./qc/repositories/qc-shore-hardness.repository.mongo";
import { PostgresQcShoreHardnessRepository } from "./qc/repositories/qc-shore-hardness.repository.postgres";
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
import { PostgresChatConversationRepository } from "./repositories/chat-conversation.repository.postgres";
import { ChatConversationParticipantRepository } from "./repositories/chat-conversation-participant.repository";
import { MongoChatConversationParticipantRepository } from "./repositories/chat-conversation-participant.repository.mongo";
import { PostgresChatConversationParticipantRepository } from "./repositories/chat-conversation-participant.repository.postgres";
import { ChatMessageRepository } from "./repositories/chat-message.repository";
import { MongoChatMessageRepository } from "./repositories/chat-message.repository.mongo";
import { PostgresChatMessageRepository } from "./repositories/chat-message.repository.postgres";
import { JobCardCoatingAnalysisRepository } from "./repositories/coating-analysis.repository";
import { MongoJobCardCoatingAnalysisRepository } from "./repositories/coating-analysis.repository.mongo";
import { PostgresJobCardCoatingAnalysisRepository } from "./repositories/coating-analysis.repository.postgres";
import { CpoCalloffRecordRepository } from "./repositories/cpo-calloff-record.repository";
import { MongoCpoCalloffRecordRepository } from "./repositories/cpo-calloff-record.repository.mongo";
import { PostgresCpoCalloffRecordRepository } from "./repositories/cpo-calloff-record.repository.postgres";
import { CustomerPurchaseOrderRepository } from "./repositories/customer-purchase-order.repository";
import { MongoCustomerPurchaseOrderRepository } from "./repositories/customer-purchase-order.repository.mongo";
import { PostgresCustomerPurchaseOrderRepository } from "./repositories/customer-purchase-order.repository.postgres";
import { CustomerPurchaseOrderItemRepository } from "./repositories/customer-purchase-order-item.repository";
import { MongoCustomerPurchaseOrderItemRepository } from "./repositories/customer-purchase-order-item.repository.mongo";
import { PostgresCustomerPurchaseOrderItemRepository } from "./repositories/customer-purchase-order-item.repository.postgres";
import { DashboardPreferenceRepository } from "./repositories/dashboard-preference.repository";
import { MongoDashboardPreferenceRepository } from "./repositories/dashboard-preference.repository.mongo";
import { PostgresDashboardPreferenceRepository } from "./repositories/dashboard-preference.repository.postgres";
import { DeliveryNoteRepository } from "./repositories/delivery-note.repository";
import { MongoDeliveryNoteRepository } from "./repositories/delivery-note.repository.mongo";
import { PostgresDeliveryNoteRepository } from "./repositories/delivery-note.repository.postgres";
import { DeliveryNoteItemRepository } from "./repositories/delivery-note-item.repository";
import { MongoDeliveryNoteItemRepository } from "./repositories/delivery-note-item.repository.mongo";
import { PostgresDeliveryNoteItemRepository } from "./repositories/delivery-note-item.repository.postgres";
import { DispatchCdnRepository } from "./repositories/dispatch-cdn.repository";
import { MongoDispatchCdnRepository } from "./repositories/dispatch-cdn.repository.mongo";
import { PostgresDispatchCdnRepository } from "./repositories/dispatch-cdn.repository.postgres";
import { DispatchLoadPhotoRepository } from "./repositories/dispatch-load-photo.repository";
import { MongoDispatchLoadPhotoRepository } from "./repositories/dispatch-load-photo.repository.mongo";
import { PostgresDispatchLoadPhotoRepository } from "./repositories/dispatch-load-photo.repository.postgres";
import { DispatchScanRepository } from "./repositories/dispatch-scan.repository";
import { MongoDispatchScanRepository } from "./repositories/dispatch-scan.repository.mongo";
import { PostgresDispatchScanRepository } from "./repositories/dispatch-scan.repository.postgres";
import { DnExtractionCorrectionRepository } from "./repositories/dn-extraction-correction.repository";
import { MongoDnExtractionCorrectionRepository } from "./repositories/dn-extraction-correction.repository.mongo";
import { PostgresDnExtractionCorrectionRepository } from "./repositories/dn-extraction-correction.repository.postgres";
import { GlossaryTermRepository } from "./repositories/glossary-term.repository";
import { MongoGlossaryTermRepository } from "./repositories/glossary-term.repository.mongo";
import { PostgresGlossaryTermRepository } from "./repositories/glossary-term.repository.postgres";
import { InspectionBookingRepository } from "./repositories/inspection-booking.repository";
import { MongoInspectionBookingRepository } from "./repositories/inspection-booking.repository.mongo";
import { PostgresInspectionBookingRepository } from "./repositories/inspection-booking.repository.postgres";
import { InvoiceClarificationRepository } from "./repositories/invoice-clarification.repository";
import { MongoInvoiceClarificationRepository } from "./repositories/invoice-clarification.repository.mongo";
import { PostgresInvoiceClarificationRepository } from "./repositories/invoice-clarification.repository.postgres";
import { InvoiceExtractionCorrectionRepository } from "./repositories/invoice-extraction-correction.repository";
import { MongoInvoiceExtractionCorrectionRepository } from "./repositories/invoice-extraction-correction.repository.mongo";
import { PostgresInvoiceExtractionCorrectionRepository } from "./repositories/invoice-extraction-correction.repository.postgres";
import { IssuanceBatchRecordRepository } from "./repositories/issuance-batch-record.repository";
import { MongoIssuanceBatchRecordRepository } from "./repositories/issuance-batch-record.repository.mongo";
import { PostgresIssuanceBatchRecordRepository } from "./repositories/issuance-batch-record.repository.postgres";
import { IssuanceSessionRepository } from "./repositories/issuance-session.repository";
import { MongoIssuanceSessionRepository } from "./repositories/issuance-session.repository.mongo";
import { PostgresIssuanceSessionRepository } from "./repositories/issuance-session.repository.postgres";
import { JobCardRepository } from "./repositories/job-card.repository";
import { MongoJobCardRepository } from "./repositories/job-card.repository.mongo";
import { PostgresJobCardRepository } from "./repositories/job-card.repository.postgres";
import { JobCardActionCompletionRepository } from "./repositories/job-card-action-completion.repository";
import { MongoJobCardActionCompletionRepository } from "./repositories/job-card-action-completion.repository.mongo";
import { PostgresJobCardActionCompletionRepository } from "./repositories/job-card-action-completion.repository.postgres";
import { JobCardApprovalRepository } from "./repositories/job-card-approval.repository";
import { MongoJobCardApprovalRepository } from "./repositories/job-card-approval.repository.mongo";
import { PostgresJobCardApprovalRepository } from "./repositories/job-card-approval.repository.postgres";
import { JobCardAttachmentRepository } from "./repositories/job-card-attachment.repository";
import { MongoJobCardAttachmentRepository } from "./repositories/job-card-attachment.repository.mongo";
import { PostgresJobCardAttachmentRepository } from "./repositories/job-card-attachment.repository.postgres";
import { JobCardBackgroundCompletionRepository } from "./repositories/job-card-background-completion.repository";
import { MongoJobCardBackgroundCompletionRepository } from "./repositories/job-card-background-completion.repository.mongo";
import { PostgresJobCardBackgroundCompletionRepository } from "./repositories/job-card-background-completion.repository.postgres";
import { JobCardDataBookRepository } from "./repositories/job-card-data-book.repository";
import { MongoJobCardDataBookRepository } from "./repositories/job-card-data-book.repository.mongo";
import { PostgresJobCardDataBookRepository } from "./repositories/job-card-data-book.repository.postgres";
import { JobCardDocumentRepository } from "./repositories/job-card-document.repository";
import { MongoJobCardDocumentRepository } from "./repositories/job-card-document.repository.mongo";
import { PostgresJobCardDocumentRepository } from "./repositories/job-card-document.repository.postgres";
import { JobCardExtractionCorrectionRepository } from "./repositories/job-card-extraction-correction.repository";
import { MongoJobCardExtractionCorrectionRepository } from "./repositories/job-card-extraction-correction.repository.mongo";
import { PostgresJobCardExtractionCorrectionRepository } from "./repositories/job-card-extraction-correction.repository.postgres";
import { JobCardImportMappingRepository } from "./repositories/job-card-import-mapping.repository";
import { MongoJobCardImportMappingRepository } from "./repositories/job-card-import-mapping.repository.mongo";
import { PostgresJobCardImportMappingRepository } from "./repositories/job-card-import-mapping.repository.postgres";
import { JobCardJobFileRepository } from "./repositories/job-card-job-file.repository";
import { MongoJobCardJobFileRepository } from "./repositories/job-card-job-file.repository.mongo";
import { PostgresJobCardJobFileRepository } from "./repositories/job-card-job-file.repository.postgres";
import { JobCardLineItemRepository } from "./repositories/job-card-line-item.repository";
import { MongoJobCardLineItemRepository } from "./repositories/job-card-line-item.repository.mongo";
import { PostgresJobCardLineItemRepository } from "./repositories/job-card-line-item.repository.postgres";
import { JobCardVersionRepository } from "./repositories/job-card-version.repository";
import { MongoJobCardVersionRepository } from "./repositories/job-card-version.repository.mongo";
import { PostgresJobCardVersionRepository } from "./repositories/job-card-version.repository.postgres";
import { PushSubscriptionRepository } from "./repositories/push-subscription.repository";
import { MongoPushSubscriptionRepository } from "./repositories/push-subscription.repository.mongo";
import { PostgresPushSubscriptionRepository } from "./repositories/push-subscription.repository.postgres";
import { QaReviewDecisionRepository } from "./repositories/qa-review-decision.repository";
import { MongoQaReviewDecisionRepository } from "./repositories/qa-review-decision.repository.mongo";
import { PostgresQaReviewDecisionRepository } from "./repositories/qa-review-decision.repository.postgres";
import { ReconciliationDocumentRepository } from "./repositories/reconciliation-document.repository";
import { MongoReconciliationDocumentRepository } from "./repositories/reconciliation-document.repository.mongo";
import { PostgresReconciliationDocumentRepository } from "./repositories/reconciliation-document.repository.postgres";
import { ReconciliationEventRepository } from "./repositories/reconciliation-event.repository";
import { MongoReconciliationEventRepository } from "./repositories/reconciliation-event.repository.mongo";
import { PostgresReconciliationEventRepository } from "./repositories/reconciliation-event.repository.postgres";
import { ReconciliationItemRepository } from "./repositories/reconciliation-item.repository";
import { MongoReconciliationItemRepository } from "./repositories/reconciliation-item.repository.mongo";
import { PostgresReconciliationItemRepository } from "./repositories/reconciliation-item.repository.postgres";
import { RequisitionRepository } from "./repositories/requisition.repository";
import { MongoRequisitionRepository } from "./repositories/requisition.repository.mongo";
import { PostgresRequisitionRepository } from "./repositories/requisition.repository.postgres";
import { RequisitionItemRepository } from "./repositories/requisition-item.repository";
import { MongoRequisitionItemRepository } from "./repositories/requisition-item.repository.mongo";
import { PostgresRequisitionItemRepository } from "./repositories/requisition-item.repository.postgres";
import { RubberCuttingTrainingRepository } from "./repositories/rubber-cutting-training.repository";
import { MongoRubberCuttingTrainingRepository } from "./repositories/rubber-cutting-training.repository.mongo";
import { PostgresRubberCuttingTrainingRepository } from "./repositories/rubber-cutting-training.repository.postgres";
import { RubberDimensionOverrideRepository } from "./repositories/rubber-dimension-override.repository";
import { MongoRubberDimensionOverrideRepository } from "./repositories/rubber-dimension-override.repository.mongo";
import { PostgresRubberDimensionOverrideRepository } from "./repositories/rubber-dimension-override.repository.postgres";
import { StaffMemberRepository } from "./repositories/staff-member.repository";
import { MongoStaffMemberRepository } from "./repositories/staff-member.repository.mongo";
import { PostgresStaffMemberRepository } from "./repositories/staff-member.repository.postgres";
import { StaffSignatureRepository } from "./repositories/staff-signature.repository";
import { MongoStaffSignatureRepository } from "./repositories/staff-signature.repository.mongo";
import { PostgresStaffSignatureRepository } from "./repositories/staff-signature.repository.postgres";
import { StockAllocationRepository } from "./repositories/stock-allocation.repository";
import { MongoStockAllocationRepository } from "./repositories/stock-allocation.repository.mongo";
import { PostgresStockAllocationRepository } from "./repositories/stock-allocation.repository.postgres";
import { StockControlActionPermissionRepository } from "./repositories/stock-control-action-permission.repository";
import { MongoStockControlActionPermissionRepository } from "./repositories/stock-control-action-permission.repository.mongo";
import { PostgresStockControlActionPermissionRepository } from "./repositories/stock-control-action-permission.repository.postgres";
import { StockControlAdminTransferRepository } from "./repositories/stock-control-admin-transfer.repository";
import { MongoStockControlAdminTransferRepository } from "./repositories/stock-control-admin-transfer.repository.mongo";
import { PostgresStockControlAdminTransferRepository } from "./repositories/stock-control-admin-transfer.repository.postgres";
import { StockControlCompanyRepository } from "./repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "./repositories/stock-control-company.repository.mongo";
import { PostgresStockControlCompanyRepository } from "./repositories/stock-control-company.repository.postgres";
import { StockControlCompanyRoleRepository } from "./repositories/stock-control-company-role.repository";
import { MongoStockControlCompanyRoleRepository } from "./repositories/stock-control-company-role.repository.mongo";
import { PostgresStockControlCompanyRoleRepository } from "./repositories/stock-control-company-role.repository.postgres";
import { StockControlDepartmentRepository } from "./repositories/stock-control-department.repository";
import { MongoStockControlDepartmentRepository } from "./repositories/stock-control-department.repository.mongo";
import { PostgresStockControlDepartmentRepository } from "./repositories/stock-control-department.repository.postgres";
import { StockControlInvitationRepository } from "./repositories/stock-control-invitation.repository";
import { MongoStockControlInvitationRepository } from "./repositories/stock-control-invitation.repository.mongo";
import { PostgresStockControlInvitationRepository } from "./repositories/stock-control-invitation.repository.postgres";
import { StockControlLocationRepository } from "./repositories/stock-control-location.repository";
import { MongoStockControlLocationRepository } from "./repositories/stock-control-location.repository.mongo";
import { PostgresStockControlLocationRepository } from "./repositories/stock-control-location.repository.postgres";
import { StockControlProfileRepository } from "./repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "./repositories/stock-control-profile.repository.mongo";
import { PostgresStockControlProfileRepository } from "./repositories/stock-control-profile.repository.postgres";
import { StockControlRbacConfigRepository } from "./repositories/stock-control-rbac-config.repository";
import { MongoStockControlRbacConfigRepository } from "./repositories/stock-control-rbac-config.repository.mongo";
import { PostgresStockControlRbacConfigRepository } from "./repositories/stock-control-rbac-config.repository.postgres";
import { StockControlSupplierRepository } from "./repositories/stock-control-supplier.repository";
import { MongoStockControlSupplierRepository } from "./repositories/stock-control-supplier.repository.mongo";
import { PostgresStockControlSupplierRepository } from "./repositories/stock-control-supplier.repository.postgres";
import { StockControlUserRepository } from "./repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "./repositories/stock-control-user.repository.mongo";
import { PostgresStockControlUserRepository } from "./repositories/stock-control-user.repository.postgres";
import { StockIssuanceRepository } from "./repositories/stock-issuance.repository";
import { MongoStockIssuanceRepository } from "./repositories/stock-issuance.repository.mongo";
import { PostgresStockIssuanceRepository } from "./repositories/stock-issuance.repository.postgres";
import { StockItemRepository } from "./repositories/stock-item.repository";
import { MongoStockItemRepository } from "./repositories/stock-item.repository.mongo";
import { PostgresStockItemRepository } from "./repositories/stock-item.repository.postgres";
import { StockMovementRepository } from "./repositories/stock-movement.repository";
import { MongoStockMovementRepository } from "./repositories/stock-movement.repository.mongo";
import { PostgresStockMovementRepository } from "./repositories/stock-movement.repository.postgres";
import { StockPriceHistoryRepository } from "./repositories/stock-price-history.repository";
import { MongoStockPriceHistoryRepository } from "./repositories/stock-price-history.repository.mongo";
import { PostgresStockPriceHistoryRepository } from "./repositories/stock-price-history.repository.postgres";
import { StockReturnRepository } from "./repositories/stock-return.repository";
import { MongoStockReturnRepository } from "./repositories/stock-return.repository.mongo";
import { PostgresStockReturnRepository } from "./repositories/stock-return.repository.postgres";
import { SupplierCertificateRepository } from "./repositories/supplier-certificate.repository";
import { MongoSupplierCertificateRepository } from "./repositories/supplier-certificate.repository.mongo";
import { PostgresSupplierCertificateRepository } from "./repositories/supplier-certificate.repository.postgres";
import { SupplierDocumentRepository } from "./repositories/supplier-document.repository";
import { MongoSupplierDocumentRepository } from "./repositories/supplier-document.repository.mongo";
import { PostgresSupplierDocumentRepository } from "./repositories/supplier-document.repository.postgres";
import { SupplierInvoiceRepository } from "./repositories/supplier-invoice.repository";
import { MongoSupplierInvoiceRepository } from "./repositories/supplier-invoice.repository.mongo";
import { PostgresSupplierInvoiceRepository } from "./repositories/supplier-invoice.repository.postgres";
import { SupplierInvoiceItemRepository } from "./repositories/supplier-invoice-item.repository";
import { MongoSupplierInvoiceItemRepository } from "./repositories/supplier-invoice-item.repository.mongo";
import { PostgresSupplierInvoiceItemRepository } from "./repositories/supplier-invoice-item.repository.postgres";
import { UserLocationAssignmentRepository } from "./repositories/user-location-assignment.repository";
import { MongoUserLocationAssignmentRepository } from "./repositories/user-location-assignment.repository.mongo";
import { PostgresUserLocationAssignmentRepository } from "./repositories/user-location-assignment.repository.postgres";
import { WorkflowNotificationRepository } from "./repositories/workflow-notification.repository";
import { MongoWorkflowNotificationRepository } from "./repositories/workflow-notification.repository.mongo";
import { PostgresWorkflowNotificationRepository } from "./repositories/workflow-notification.repository.postgres";
import { WorkflowNotificationRecipientRepository } from "./repositories/workflow-notification-recipient.repository";
import { MongoWorkflowNotificationRecipientRepository } from "./repositories/workflow-notification-recipient.repository.mongo";
import { PostgresWorkflowNotificationRecipientRepository } from "./repositories/workflow-notification-recipient.repository.postgres";
import { WorkflowStepAssignmentRepository } from "./repositories/workflow-step-assignment.repository";
import { MongoWorkflowStepAssignmentRepository } from "./repositories/workflow-step-assignment.repository.mongo";
import { PostgresWorkflowStepAssignmentRepository } from "./repositories/workflow-step-assignment.repository.postgres";
import { WorkflowStepConfigRepository } from "./repositories/workflow-step-config.repository";
import { MongoWorkflowStepConfigRepository } from "./repositories/workflow-step-config.repository.mongo";
import { PostgresWorkflowStepConfigRepository } from "./repositories/workflow-step-config.repository.postgres";
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
import { RubberCuttingTrainingSchema } from "./schemas/rubber-cutting-training.schema";
import { RubberDimensionOverrideSchema } from "./schemas/rubber-dimension-override.schema";
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
import { JobCardImportService } from "./services/job-card-import.service";
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
import { RubberCuttingTrainingService } from "./services/rubber-cutting-training.service";
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
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "ChatConversation", schema: ChatConversationSchema },
            {
              name: "ChatConversationParticipant",
              schema: ChatConversationParticipantSchema,
            },
            { name: "ChatMessage", schema: ChatMessageSchema },
            { name: "JobCardCoatingAnalysis", schema: JobCardCoatingAnalysisSchema },
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
            { name: "Company", schema: CompanySchema },
            { name: "User", schema: UserSchema },
            { name: "NixLearning", schema: NixLearningSchema },
            { name: "RubberRollStock", schema: RubberRollStockSchema },
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
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            StockControlUser,
            StockControlCompany,
            StockControlProfile,
            Company,
            User,
            StockControlInvitation,
            StockControlDepartment,
            StockControlLocation,
            StockItem,
            JobCard,
            StockAllocation,
            JobCardImportMapping,
            JobCardLineItem,
            DeliveryNote,
            DeliveryNoteItem,
            StockMovement,
            JobCardCoatingAnalysis,
            Requisition,
            RequisitionItem,
            StaffMember,
            JobCardActionCompletion,
            JobCardApproval,
            JobCardDocument,
            JobCardVersion,
            JobCardAttachment,
            WorkflowNotification,
            WorkflowStepAssignment,
            DispatchScan,
            DispatchCdn,
            DispatchLoadPhoto,
            StaffSignature,
            StockIssuance,
            SupplierInvoice,
            SupplierInvoiceItem,
            InvoiceExtractionCorrection,
            InvoiceClarification,
            StockPriceHistory,
            StockControlCompanyRole,
            StockControlAdminTransfer,
            StockControlActionPermission,
            StockControlRbacConfig,
            StockControlSupplier,
            PushSubscription,
            RubberCuttingTraining,
            RubberDimensionOverride,
            CustomerPurchaseOrder,
            CustomerPurchaseOrderItem,
            CpoCalloffRecord,
            DashboardPreference,
            GlossaryTerm,
            WorkflowNotificationRecipient,
            UserLocationAssignment,
            SupplierCertificate,
            SupplierDocument,
            IssuanceBatchRecord,
            IssuanceSession,
            JobCardDataBook,
            ChatMessage,
            ChatConversation,
            ChatConversationParticipant,
            WorkflowStepConfig,
            JobCardBackgroundCompletion,
            JobCardExtractionCorrection,
            JobCardJobFile,
            QaReviewDecision,
            InspectionBooking,
            ReconciliationDocument,
            ReconciliationItem,
            ReconciliationEvent,
            StockReturn,
            RubberRollStock,
            RubberProductCoding,
            DnExtractionCorrection,
            NixLearning,
            CalibrationCertificate,
            QcBatchAssignment,
            QcBlastProfile,
            QcControlPlan,
            QcDefelskoBatch,
            QcDftReading,
            QcDustDebrisTest,
            QcItemsRelease,
            QcPullTest,
            QcReleaseCertificate,
            QcShoreHardness,
          ]),
        ]),
    AdminModule,
    EmailModule,
    FlangeDimensionModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET", "stock-control-jwt-secret"),
        signOptions: { expiresIn: "8h" },
      }),
    }),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    QcModule,
    NixModule,
    MetricsModule,
    NbOdLookupModule,
    PipeScheduleModule,
    RubberLiningModule,
    SageExportModule,
    SharedModule,
    StaffLeaveModule,
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
    DeliverySupplierService,
    DeliveryExtractionService,
    DeliveryInvoiceService,
    DeliveryService,
    MovementService,
    ImportService,
    StockTakeReconciliationService,
    JobCardImportService,
    M2CalculationService,
    CoatingAnalysisService,
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
    repositoryProvider(
      ChatConversationRepository,
      PostgresChatConversationRepository,
      MongoChatConversationRepository,
    ),
    repositoryProvider(
      ChatConversationParticipantRepository,
      PostgresChatConversationParticipantRepository,
      MongoChatConversationParticipantRepository,
    ),
    repositoryProvider(
      ChatMessageRepository,
      PostgresChatMessageRepository,
      MongoChatMessageRepository,
    ),
    repositoryProvider(
      JobCardCoatingAnalysisRepository,
      PostgresJobCardCoatingAnalysisRepository,
      MongoJobCardCoatingAnalysisRepository,
    ),
    repositoryProvider(
      CpoCalloffRecordRepository,
      PostgresCpoCalloffRecordRepository,
      MongoCpoCalloffRecordRepository,
    ),
    repositoryProvider(
      CustomerPurchaseOrderItemRepository,
      PostgresCustomerPurchaseOrderItemRepository,
      MongoCustomerPurchaseOrderItemRepository,
    ),
    repositoryProvider(
      CustomerPurchaseOrderRepository,
      PostgresCustomerPurchaseOrderRepository,
      MongoCustomerPurchaseOrderRepository,
    ),
    repositoryProvider(
      DashboardPreferenceRepository,
      PostgresDashboardPreferenceRepository,
      MongoDashboardPreferenceRepository,
    ),
    repositoryProvider(
      DeliveryNoteItemRepository,
      PostgresDeliveryNoteItemRepository,
      MongoDeliveryNoteItemRepository,
    ),
    repositoryProvider(
      DeliveryNoteRepository,
      PostgresDeliveryNoteRepository,
      MongoDeliveryNoteRepository,
    ),
    repositoryProvider(
      DispatchCdnRepository,
      PostgresDispatchCdnRepository,
      MongoDispatchCdnRepository,
    ),
    repositoryProvider(
      DispatchLoadPhotoRepository,
      PostgresDispatchLoadPhotoRepository,
      MongoDispatchLoadPhotoRepository,
    ),
    repositoryProvider(
      DispatchScanRepository,
      PostgresDispatchScanRepository,
      MongoDispatchScanRepository,
    ),
    repositoryProvider(
      DnExtractionCorrectionRepository,
      PostgresDnExtractionCorrectionRepository,
      MongoDnExtractionCorrectionRepository,
    ),
    repositoryProvider(
      GlossaryTermRepository,
      PostgresGlossaryTermRepository,
      MongoGlossaryTermRepository,
    ),
    repositoryProvider(
      InspectionBookingRepository,
      PostgresInspectionBookingRepository,
      MongoInspectionBookingRepository,
    ),
    repositoryProvider(
      InvoiceClarificationRepository,
      PostgresInvoiceClarificationRepository,
      MongoInvoiceClarificationRepository,
    ),
    repositoryProvider(
      InvoiceExtractionCorrectionRepository,
      PostgresInvoiceExtractionCorrectionRepository,
      MongoInvoiceExtractionCorrectionRepository,
    ),
    repositoryProvider(
      IssuanceBatchRecordRepository,
      PostgresIssuanceBatchRecordRepository,
      MongoIssuanceBatchRecordRepository,
    ),
    repositoryProvider(
      IssuanceSessionRepository,
      PostgresIssuanceSessionRepository,
      MongoIssuanceSessionRepository,
    ),
    repositoryProvider(
      JobCardActionCompletionRepository,
      PostgresJobCardActionCompletionRepository,
      MongoJobCardActionCompletionRepository,
    ),
    repositoryProvider(
      JobCardApprovalRepository,
      PostgresJobCardApprovalRepository,
      MongoJobCardApprovalRepository,
    ),
    repositoryProvider(
      JobCardAttachmentRepository,
      PostgresJobCardAttachmentRepository,
      MongoJobCardAttachmentRepository,
    ),
    repositoryProvider(JobCardRepository, PostgresJobCardRepository, MongoJobCardRepository),
    repositoryProvider(
      JobCardBackgroundCompletionRepository,
      PostgresJobCardBackgroundCompletionRepository,
      MongoJobCardBackgroundCompletionRepository,
    ),
    repositoryProvider(
      JobCardDataBookRepository,
      PostgresJobCardDataBookRepository,
      MongoJobCardDataBookRepository,
    ),
    repositoryProvider(
      JobCardDocumentRepository,
      PostgresJobCardDocumentRepository,
      MongoJobCardDocumentRepository,
    ),
    repositoryProvider(
      JobCardExtractionCorrectionRepository,
      PostgresJobCardExtractionCorrectionRepository,
      MongoJobCardExtractionCorrectionRepository,
    ),
    repositoryProvider(
      JobCardImportMappingRepository,
      PostgresJobCardImportMappingRepository,
      MongoJobCardImportMappingRepository,
    ),
    repositoryProvider(
      JobCardJobFileRepository,
      PostgresJobCardJobFileRepository,
      MongoJobCardJobFileRepository,
    ),
    repositoryProvider(
      JobCardLineItemRepository,
      PostgresJobCardLineItemRepository,
      MongoJobCardLineItemRepository,
    ),
    repositoryProvider(
      JobCardVersionRepository,
      PostgresJobCardVersionRepository,
      MongoJobCardVersionRepository,
    ),
    repositoryProvider(
      PushSubscriptionRepository,
      PostgresPushSubscriptionRepository,
      MongoPushSubscriptionRepository,
    ),
    repositoryProvider(
      QaReviewDecisionRepository,
      PostgresQaReviewDecisionRepository,
      MongoQaReviewDecisionRepository,
    ),
    repositoryProvider(
      ReconciliationDocumentRepository,
      PostgresReconciliationDocumentRepository,
      MongoReconciliationDocumentRepository,
    ),
    repositoryProvider(
      ReconciliationEventRepository,
      PostgresReconciliationEventRepository,
      MongoReconciliationEventRepository,
    ),
    repositoryProvider(
      ReconciliationItemRepository,
      PostgresReconciliationItemRepository,
      MongoReconciliationItemRepository,
    ),
    repositoryProvider(
      RequisitionRepository,
      PostgresRequisitionRepository,
      MongoRequisitionRepository,
    ),
    repositoryProvider(
      RequisitionItemRepository,
      PostgresRequisitionItemRepository,
      MongoRequisitionItemRepository,
    ),
    repositoryProvider(
      RubberCuttingTrainingRepository,
      PostgresRubberCuttingTrainingRepository,
      MongoRubberCuttingTrainingRepository,
    ),
    repositoryProvider(
      RubberDimensionOverrideRepository,
      PostgresRubberDimensionOverrideRepository,
      MongoRubberDimensionOverrideRepository,
    ),
    repositoryProvider(
      StaffMemberRepository,
      PostgresStaffMemberRepository,
      MongoStaffMemberRepository,
    ),
    repositoryProvider(
      StaffSignatureRepository,
      PostgresStaffSignatureRepository,
      MongoStaffSignatureRepository,
    ),
    repositoryProvider(
      StockAllocationRepository,
      PostgresStockAllocationRepository,
      MongoStockAllocationRepository,
    ),
    repositoryProvider(
      StockControlActionPermissionRepository,
      PostgresStockControlActionPermissionRepository,
      MongoStockControlActionPermissionRepository,
    ),
    repositoryProvider(
      StockControlAdminTransferRepository,
      PostgresStockControlAdminTransferRepository,
      MongoStockControlAdminTransferRepository,
    ),
    repositoryProvider(
      StockControlCompanyRepository,
      PostgresStockControlCompanyRepository,
      MongoStockControlCompanyRepository,
    ),
    repositoryProvider(
      StockControlCompanyRoleRepository,
      PostgresStockControlCompanyRoleRepository,
      MongoStockControlCompanyRoleRepository,
    ),
    repositoryProvider(
      StockControlDepartmentRepository,
      PostgresStockControlDepartmentRepository,
      MongoStockControlDepartmentRepository,
    ),
    repositoryProvider(
      StockControlInvitationRepository,
      PostgresStockControlInvitationRepository,
      MongoStockControlInvitationRepository,
    ),
    repositoryProvider(
      StockControlLocationRepository,
      PostgresStockControlLocationRepository,
      MongoStockControlLocationRepository,
    ),
    repositoryProvider(
      StockControlProfileRepository,
      PostgresStockControlProfileRepository,
      MongoStockControlProfileRepository,
    ),
    repositoryProvider(
      StockControlRbacConfigRepository,
      PostgresStockControlRbacConfigRepository,
      MongoStockControlRbacConfigRepository,
    ),
    repositoryProvider(
      StockControlSupplierRepository,
      PostgresStockControlSupplierRepository,
      MongoStockControlSupplierRepository,
    ),
    repositoryProvider(
      StockControlUserRepository,
      PostgresStockControlUserRepository,
      MongoStockControlUserRepository,
    ),
    repositoryProvider(
      StockIssuanceRepository,
      PostgresStockIssuanceRepository,
      MongoStockIssuanceRepository,
    ),
    repositoryProvider(StockItemRepository, PostgresStockItemRepository, MongoStockItemRepository),
    repositoryProvider(
      StockMovementRepository,
      PostgresStockMovementRepository,
      MongoStockMovementRepository,
    ),
    repositoryProvider(
      StockPriceHistoryRepository,
      PostgresStockPriceHistoryRepository,
      MongoStockPriceHistoryRepository,
    ),
    repositoryProvider(
      StockReturnRepository,
      PostgresStockReturnRepository,
      MongoStockReturnRepository,
    ),
    repositoryProvider(
      SupplierCertificateRepository,
      PostgresSupplierCertificateRepository,
      MongoSupplierCertificateRepository,
    ),
    repositoryProvider(
      SupplierDocumentRepository,
      PostgresSupplierDocumentRepository,
      MongoSupplierDocumentRepository,
    ),
    repositoryProvider(
      SupplierInvoiceRepository,
      PostgresSupplierInvoiceRepository,
      MongoSupplierInvoiceRepository,
    ),
    repositoryProvider(
      SupplierInvoiceItemRepository,
      PostgresSupplierInvoiceItemRepository,
      MongoSupplierInvoiceItemRepository,
    ),
    repositoryProvider(
      UserLocationAssignmentRepository,
      PostgresUserLocationAssignmentRepository,
      MongoUserLocationAssignmentRepository,
    ),
    repositoryProvider(
      WorkflowNotificationRepository,
      PostgresWorkflowNotificationRepository,
      MongoWorkflowNotificationRepository,
    ),
    repositoryProvider(
      WorkflowNotificationRecipientRepository,
      PostgresWorkflowNotificationRecipientRepository,
      MongoWorkflowNotificationRecipientRepository,
    ),
    repositoryProvider(
      WorkflowStepAssignmentRepository,
      PostgresWorkflowStepAssignmentRepository,
      MongoWorkflowStepAssignmentRepository,
    ),
    repositoryProvider(
      WorkflowStepConfigRepository,
      PostgresWorkflowStepConfigRepository,
      MongoWorkflowStepConfigRepository,
    ),
    repositoryProvider(CompanyRepository, PostgresCompanyRepository, MongoCompanyRepository),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(
      NixLearningRepository,
      PostgresNixLearningRepository,
      MongoNixLearningRepository,
    ),
    repositoryProvider(
      RubberRollStockRepository,
      PostgresRubberRollStockRepository,
      MongoRubberRollStockRepository,
    ),
    repositoryProvider(
      CalibrationCertificateRepository,
      PostgresCalibrationCertificateRepository,
      MongoCalibrationCertificateRepository,
    ),
    repositoryProvider(
      QcBatchAssignmentRepository,
      PostgresQcBatchAssignmentRepository,
      MongoQcBatchAssignmentRepository,
    ),
    repositoryProvider(
      QcBlastProfileRepository,
      PostgresQcBlastProfileRepository,
      MongoQcBlastProfileRepository,
    ),
    repositoryProvider(
      QcControlPlanRepository,
      PostgresQcControlPlanRepository,
      MongoQcControlPlanRepository,
    ),
    repositoryProvider(
      QcDefelskoBatchRepository,
      PostgresQcDefelskoBatchRepository,
      MongoQcDefelskoBatchRepository,
    ),
    repositoryProvider(
      QcDftReadingRepository,
      PostgresQcDftReadingRepository,
      MongoQcDftReadingRepository,
    ),
    repositoryProvider(
      QcDustDebrisTestRepository,
      PostgresQcDustDebrisTestRepository,
      MongoQcDustDebrisTestRepository,
    ),
    repositoryProvider(
      QcItemsReleaseRepository,
      PostgresQcItemsReleaseRepository,
      MongoQcItemsReleaseRepository,
    ),
    repositoryProvider(
      QcPullTestRepository,
      PostgresQcPullTestRepository,
      MongoQcPullTestRepository,
    ),
    repositoryProvider(
      QcReleaseCertificateRepository,
      PostgresQcReleaseCertificateRepository,
      MongoQcReleaseCertificateRepository,
    ),
    repositoryProvider(
      QcShoreHardnessRepository,
      PostgresQcShoreHardnessRepository,
      MongoQcShoreHardnessRepository,
    ),
  ],
  exports: [StockControlAuthService],
})
export class StockControlModule {}
