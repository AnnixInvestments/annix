import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailModule } from "../email/email.module";
import { NbOdLookupModule } from "../nb-od-lookup/nb-od-lookup.module";
import { NixModule } from "../nix/nix.module";
import { PipeScheduleModule } from "../pipe-schedule/pipe-schedule.module";
import { RubberLiningModule } from "../rubber-lining/rubber-lining.module";
import { SageExportModule } from "../sage-export/sage-export.module";
import { SharedModule } from "../shared/shared.module";
import { StaffLeaveModule } from "../staff-leave/staff-leave.module";
import { StorageModule } from "../storage/storage.module";
import { StockControlAuthController } from "./controllers/auth.controller";
import { CertificateController } from "./controllers/certificate.controller";
import { ChatController } from "./controllers/chat.controller";
import { CpoController } from "./controllers/cpo.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { DeliveriesController } from "./controllers/deliveries.controller";
import { GlossaryController } from "./controllers/glossary.controller";
import { ImportController } from "./controllers/import.controller";
import { InventoryController } from "./controllers/inventory.controller";
import { InvitationController } from "./controllers/invitation.controller";
import { InvoicesController } from "./controllers/invoices.controller";
import { IssuanceController } from "./controllers/issuance.controller";
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
import { SupplierController } from "./controllers/supplier.controller";
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
import { DispatchScan } from "./entities/dispatch-scan.entity";
import { GlossaryTerm } from "./entities/glossary-term.entity";
import { InspectionBooking } from "./entities/inspection-booking.entity";
import { InvoiceClarification } from "./entities/invoice-clarification.entity";
import { InvoiceExtractionCorrection } from "./entities/invoice-extraction-correction.entity";
import { IssuanceBatchRecord } from "./entities/issuance-batch-record.entity";
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
import { StockControlRbacConfig } from "./entities/stock-control-rbac-config.entity";
import { StockControlSupplier } from "./entities/stock-control-supplier.entity";
import { StockControlUser } from "./entities/stock-control-user.entity";
import { StockIssuance } from "./entities/stock-issuance.entity";
import { StockItem } from "./entities/stock-item.entity";
import { StockMovement } from "./entities/stock-movement.entity";
import { StockPriceHistory } from "./entities/stock-price-history.entity";
import { StockReturn } from "./entities/stock-return.entity";
import { SupplierCertificate } from "./entities/supplier-certificate.entity";
import { SupplierInvoice } from "./entities/supplier-invoice.entity";
import { SupplierInvoiceItem } from "./entities/supplier-invoice-item.entity";
import { UserLocationAssignment } from "./entities/user-location-assignment.entity";
import { WorkflowNotification } from "./entities/workflow-notification.entity";
import { WorkflowNotificationRecipient } from "./entities/workflow-notification-recipient.entity";
import { WorkflowStepAssignment } from "./entities/workflow-step-assignment.entity";
import { WorkflowStepConfig } from "./entities/workflow-step-config.entity";
import { MessagingEnabledGuard } from "./guards/messaging-enabled.guard";
import { StockControlAuthGuard } from "./guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "./guards/stock-control-role.guard";
import { QcModule } from "./qc/qc.module";
import { ActionPermissionService } from "./services/action-permission.service";
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
import { DrawingExtractionService } from "./services/drawing-extraction.service";
import { GlossaryService } from "./services/glossary.service";
import { ImportService } from "./services/import.service";
import { InspectionBookingService } from "./services/inspection-booking.service";
import { InventoryService } from "./services/inventory.service";
import { StockControlInvitationService } from "./services/invitation.service";
import { InvoiceService } from "./services/invoice.service";
import { InvoiceExtractionService } from "./services/invoice-extraction.service";
import { IssuanceService } from "./services/issuance.service";
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
import { SageInvoiceAdapterService } from "./services/sage-invoice-adapter.service";
import { ScEmailClassifierService } from "./services/sc-email-classifier.service";
import { ScEmailRegistrationService } from "./services/sc-email-registration.service";
import { ScEmailRouterService } from "./services/sc-email-router.service";
import { SearchService } from "./services/search.service";
import { SignatureService } from "./services/signature.service";
import { StaffService } from "./services/staff.service";
import { StockAllocationService } from "./services/stock-allocation.service";
import { WebPushService } from "./services/web-push.service";
import { WorkflowAssignmentService } from "./services/workflow-assignment.service";
import { WorkflowNotificationService } from "./services/workflow-notification.service";
import { WorkflowStepConfigService } from "./services/workflow-step-config.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockControlUser,
      StockControlCompany,
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
      RubberDimensionOverride,
      CustomerPurchaseOrder,
      CustomerPurchaseOrderItem,
      CpoCalloffRecord,
      DashboardPreference,
      GlossaryTerm,
      WorkflowNotificationRecipient,
      UserLocationAssignment,
      SupplierCertificate,
      IssuanceBatchRecord,
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
    ]),
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET", "stock-control-jwt-secret"),
        signOptions: { expiresIn: "1h" },
      }),
    }),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    QcModule,
    NixModule,
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
    InventoryController,
    JobCardsController,
    DeliveriesController,
    MovementsController,
    ImportController,
    IssuanceController,
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
    ChatController,
    ReconciliationController,
  ],
  providers: [
    StockControlAuthGuard,
    StockControlRoleGuard,
    MessagingEnabledGuard,
    StockControlAuthService,
    PublicBrandingService,
    BrandingScraperService,
    StockControlInvitationService,
    InventoryService,
    IssuanceService,
    JobCardService,
    DeliverySupplierService,
    DeliveryExtractionService,
    DeliveryInvoiceService,
    DeliveryService,
    MovementService,
    ImportService,
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
    DataBookPdfService,
    ChatService,
    WorkflowStepConfigService,
    BackgroundStepService,
    QaProcessService,
    InspectionBookingService,
    ScEmailClassifierService,
    ScEmailRouterService,
    ScEmailRegistrationService,
    JobFileService,
    ReconciliationDocumentService,
    ReconciliationExtractionService,
    ReconciliationService,
    StockAllocationService,
  ],
})
export class StockControlModule {}
