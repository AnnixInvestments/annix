import { forwardRef, Module } from "@nestjs/common";
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
import { RubberLiningModule } from "../rubber-lining/rubber-lining.module";
import { SageExportModule } from "../sage-export/sage-export.module";
import { SharedModule } from "../shared/shared.module";
import { StaffLeaveModule } from "../staff-leave/staff-leave.module";
import { StockManagementModule } from "../stock-management/stock-management.module";
import { StorageModule } from "../storage/storage.module";
import { StockControlCapabilities } from "./capabilities/stock-control.capabilities";
import { StockControlAuthController } from "./controllers/auth.controller";
import { CertificateController } from "./controllers/certificate.controller";
import { ChatController } from "./controllers/chat.controller";
import { CpoController } from "./controllers/cpo.controller";
import { StockControlCustomersController } from "./controllers/customers.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { ImportController } from "./controllers/import.controller";
import { InvitationController } from "./controllers/invitation.controller";
import { PublicBrandingController } from "./controllers/public-branding.controller";
import { QrCodeController } from "./controllers/qr-code.controller";
import { ReportsController } from "./controllers/reports.controller";
import { SearchController } from "./controllers/search.controller";
import { StaffController } from "./controllers/staff.controller";
import { StockTakeReconciliationController } from "./controllers/stock-take-reconciliation.controller";
import { StockControlCoreModule } from "./core/stock-control-core.module";
import { CpoModule } from "./cpo/cpo.module";
import { DeliveriesInvoicingModule } from "./deliveries-invoicing/deliveries-invoicing.module";
import { DeliverySupportModule } from "./delivery-support/delivery-support.module";
import { GlossaryModule } from "./glossary/glossary.module";
import { MessagingEnabledGuard } from "./guards/messaging-enabled.guard";
import { InventoryModule } from "./inventory/inventory.module";
import { JobCardsModule } from "./job-cards/job-cards.module";
import { MovementsModule } from "./movements/movements.module";
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
import { DashboardPreferenceRepository } from "./repositories/dashboard-preference.repository";
import { MongoDashboardPreferenceRepository } from "./repositories/dashboard-preference.repository.mongo";
import { IssuanceBatchRecordRepository } from "./repositories/issuance-batch-record.repository";
import { MongoIssuanceBatchRecordRepository } from "./repositories/issuance-batch-record.repository.mongo";
import { IssuanceSessionRepository } from "./repositories/issuance-session.repository";
import { MongoIssuanceSessionRepository } from "./repositories/issuance-session.repository.mongo";
import { JobCardDataBookRepository } from "./repositories/job-card-data-book.repository";
import { MongoJobCardDataBookRepository } from "./repositories/job-card-data-book.repository.mongo";
import { StockControlDepartmentRepository } from "./repositories/stock-control-department.repository";
import { MongoStockControlDepartmentRepository } from "./repositories/stock-control-department.repository.mongo";
import { StockControlLocationRepository } from "./repositories/stock-control-location.repository";
import { MongoStockControlLocationRepository } from "./repositories/stock-control-location.repository.mongo";
import { StockControlSupplierRepository } from "./repositories/stock-control-supplier.repository";
import { MongoStockControlSupplierRepository } from "./repositories/stock-control-supplier.repository.mongo";
import { SupplierCertificateRepository } from "./repositories/supplier-certificate.repository";
import { MongoSupplierCertificateRepository } from "./repositories/supplier-certificate.repository.mongo";
import { RequisitionModule } from "./requisition/requisition.module";
import { RubberPricingModule } from "./rubber-pricing/rubber-pricing.module";
import { ChatConversationSchema } from "./schemas/chat-conversation.schema";
import { ChatConversationParticipantSchema } from "./schemas/chat-conversation-participant.schema";
import { ChatMessageSchema } from "./schemas/chat-message.schema";
import { DashboardPreferenceSchema } from "./schemas/dashboard-preference.schema";
import { IssuanceBatchRecordSchema } from "./schemas/issuance-batch-record.schema";
import { IssuanceSessionSchema } from "./schemas/issuance-session.schema";
import { JobCardDataBookSchema } from "./schemas/job-card-data-book.schema";
import { StockControlDepartmentSchema } from "./schemas/stock-control-department.schema";
import { StockControlLocationSchema } from "./schemas/stock-control-location.schema";
import { StockControlSupplierSchema } from "./schemas/stock-control-supplier.schema";
import { SupplierCertificateSchema } from "./schemas/supplier-certificate.schema";
import { AscaQuoteDocumentsProfileHandler } from "./services/asca-quote-documents-profile.handler";
import { BrandingScraperService } from "./services/branding-scraper.service";
import { CertificateService } from "./services/certificate.service";
import { CertificateAnalysisService } from "./services/certificate-analysis.service";
import { ChatService } from "./services/chat.service";
import { CompanyEmailService } from "./services/company-email.service";
import { DashboardService } from "./services/dashboard.service";
import { DataBookPdfService } from "./services/data-book-pdf.service";
import { ImportService } from "./services/import.service";
import { StockControlInvitationService } from "./services/invitation.service";
import { LookupService } from "./services/lookup.service";
import { M2CalculationService } from "./services/m2-calculation.service";
import { QrCodeService } from "./services/qr-code.service";
import { ReportsService } from "./services/reports.service";
import { SageJcDumpService } from "./services/sage-jc-dump.service";
import { ScEmailAdapterService } from "./services/sc-email-adapter.service";
import { SearchService } from "./services/search.service";
import { StaffService } from "./services/staff.service";
import { StockTakeReconciliationService } from "./services/stock-take-reconciliation.service";
import { WorkflowNotificationService } from "./services/workflow-notification.service";
import { SuppliersModule } from "./suppliers/suppliers.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "ChatConversation", schema: ChatConversationSchema },
      {
        name: "ChatConversationParticipant",
        schema: ChatConversationParticipantSchema,
      },
      { name: "ChatMessage", schema: ChatMessageSchema },
      { name: "DashboardPreference", schema: DashboardPreferenceSchema },
      { name: "IssuanceBatchRecord", schema: IssuanceBatchRecordSchema },
      { name: "IssuanceSession", schema: IssuanceSessionSchema },
      { name: "JobCardDataBook", schema: JobCardDataBookSchema },
      { name: "StockControlDepartment", schema: StockControlDepartmentSchema },
      { name: "StockControlLocation", schema: StockControlLocationSchema },
      { name: "StockControlSupplier", schema: StockControlSupplierSchema },
      { name: "SupplierCertificate", schema: SupplierCertificateSchema },
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
    StockControlCoreModule,
    DeliveriesInvoicingModule,
    forwardRef(() => CpoModule),
    forwardRef(() => JobCardsModule),
    DeliverySupportModule,
    InventoryModule,
    AdminModule,
    CoatingSpecificationModule,
    EmailModule,
    FlangeDimensionModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    GlossaryModule,
    MovementsModule,
    PaintPricingModule,
    QcModule,
    RequisitionModule,
    RubberPricingModule,
    SuppliersModule,
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
    ImportController,
    StockTakeReconciliationController,
    DashboardController,
    ReportsController,
    InvitationController,
    QrCodeController,
    SearchController,
    StaffController,
    CpoController,
    CertificateController,
    ChatController,
    StockControlCustomersController,
  ],
  providers: [
    MessagingEnabledGuard,
    BrandingScraperService,
    StockControlInvitationService,
    ImportService,
    StockTakeReconciliationService,
    M2CalculationService,
    CompanyEmailService,
    DashboardService,
    QrCodeService,
    ReportsService,
    StaffService,
    LookupService,
    WorkflowNotificationService,
    SearchService,
    CertificateService,
    CertificateAnalysisService,
    DataBookPdfService,
    ChatService,
    ScEmailAdapterService,
    SageJcDumpService,
    AscaQuoteDocumentsProfileHandler,
    StockControlCapabilities,
    repositoryProvider(ChatConversationRepository, MongoChatConversationRepository),
    repositoryProvider(
      ChatConversationParticipantRepository,
      MongoChatConversationParticipantRepository,
    ),
    repositoryProvider(ChatMessageRepository, MongoChatMessageRepository),
    repositoryProvider(DashboardPreferenceRepository, MongoDashboardPreferenceRepository),
    repositoryProvider(IssuanceBatchRecordRepository, MongoIssuanceBatchRecordRepository),
    repositoryProvider(IssuanceSessionRepository, MongoIssuanceSessionRepository),
    repositoryProvider(JobCardDataBookRepository, MongoJobCardDataBookRepository),
    repositoryProvider(StockControlDepartmentRepository, MongoStockControlDepartmentRepository),
    repositoryProvider(StockControlLocationRepository, MongoStockControlLocationRepository),
    repositoryProvider(StockControlSupplierRepository, MongoStockControlSupplierRepository),
    repositoryProvider(SupplierCertificateRepository, MongoSupplierCertificateRepository),
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
  exports: [
    StockControlCoreModule,
    WorkflowNotificationService,
    M2CalculationService,
    CompanyEmailService,
  ],
})
export class StockControlModule {}
