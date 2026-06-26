import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { MetricsModule } from "../../metrics/metrics.module";
import { NixModule } from "../../nix/nix.module";
import { StorageModule } from "../../storage/storage.module";
import { InspectionPublicController } from "../controllers/inspection-public.controller";
import { JobCardImportController } from "../controllers/job-card-import.controller";
import { JobCardsController } from "../controllers/job-cards.controller";
import { ReconciliationController } from "../controllers/reconciliation.controller";
import { SignatureController } from "../controllers/signature.controller";
import { WorkflowController } from "../controllers/workflow.controller";
import { StockControlCoreModule } from "../core/stock-control-core.module";
import { CpoModule } from "../cpo/cpo.module";
import { M2CalculationModule } from "../m2-calculation/m2-calculation.module";
import { QcModule } from "../qc/qc.module";
import { DispatchCdnRepository } from "../repositories/dispatch-cdn.repository";
import { MongoDispatchCdnRepository } from "../repositories/dispatch-cdn.repository.mongo";
import { DispatchLoadPhotoRepository } from "../repositories/dispatch-load-photo.repository";
import { MongoDispatchLoadPhotoRepository } from "../repositories/dispatch-load-photo.repository.mongo";
import { DispatchScanRepository } from "../repositories/dispatch-scan.repository";
import { MongoDispatchScanRepository } from "../repositories/dispatch-scan.repository.mongo";
import { InspectionBookingRepository } from "../repositories/inspection-booking.repository";
import { MongoInspectionBookingRepository } from "../repositories/inspection-booking.repository.mongo";
import { JobCardActionCompletionRepository } from "../repositories/job-card-action-completion.repository";
import { MongoJobCardActionCompletionRepository } from "../repositories/job-card-action-completion.repository.mongo";
import { JobCardAttachmentRepository } from "../repositories/job-card-attachment.repository";
import { MongoJobCardAttachmentRepository } from "../repositories/job-card-attachment.repository.mongo";
import { JobCardBackgroundCompletionRepository } from "../repositories/job-card-background-completion.repository";
import { MongoJobCardBackgroundCompletionRepository } from "../repositories/job-card-background-completion.repository.mongo";
import { JobCardDocumentRepository } from "../repositories/job-card-document.repository";
import { MongoJobCardDocumentRepository } from "../repositories/job-card-document.repository.mongo";
import { JobCardImportJobRepository } from "../repositories/job-card-import-job.repository";
import { MongoJobCardImportJobRepository } from "../repositories/job-card-import-job.repository.mongo";
import { JobCardImportMappingRepository } from "../repositories/job-card-import-mapping.repository";
import { MongoJobCardImportMappingRepository } from "../repositories/job-card-import-mapping.repository.mongo";
import { JobCardVersionRepository } from "../repositories/job-card-version.repository";
import { MongoJobCardVersionRepository } from "../repositories/job-card-version.repository.mongo";
import { QaReviewDecisionRepository } from "../repositories/qa-review-decision.repository";
import { MongoQaReviewDecisionRepository } from "../repositories/qa-review-decision.repository.mongo";
import { ReconciliationDocumentRepository } from "../repositories/reconciliation-document.repository";
import { MongoReconciliationDocumentRepository } from "../repositories/reconciliation-document.repository.mongo";
import { ReconciliationEventRepository } from "../repositories/reconciliation-event.repository";
import { MongoReconciliationEventRepository } from "../repositories/reconciliation-event.repository.mongo";
import { ReconciliationItemRepository } from "../repositories/reconciliation-item.repository";
import { MongoReconciliationItemRepository } from "../repositories/reconciliation-item.repository.mongo";
import { RubberCuttingTrainingRepository } from "../repositories/rubber-cutting-training.repository";
import { MongoRubberCuttingTrainingRepository } from "../repositories/rubber-cutting-training.repository.mongo";
import { RubberDimensionOverrideRepository } from "../repositories/rubber-dimension-override.repository";
import { MongoRubberDimensionOverrideRepository } from "../repositories/rubber-dimension-override.repository.mongo";
import { StaffSignatureRepository } from "../repositories/staff-signature.repository";
import { MongoStaffSignatureRepository } from "../repositories/staff-signature.repository.mongo";
import { StockReturnRepository } from "../repositories/stock-return.repository";
import { MongoStockReturnRepository } from "../repositories/stock-return.repository.mongo";
import { WorkflowStepConfigRepository } from "../repositories/workflow-step-config.repository";
import { MongoWorkflowStepConfigRepository } from "../repositories/workflow-step-config.repository.mongo";
import { RequisitionModule } from "../requisition/requisition.module";
import { DispatchCdnSchema } from "../schemas/dispatch-cdn.schema";
import { DispatchLoadPhotoSchema } from "../schemas/dispatch-load-photo.schema";
import { DispatchScanSchema } from "../schemas/dispatch-scan.schema";
import { InspectionBookingSchema } from "../schemas/inspection-booking.schema";
import { JobCardActionCompletionSchema } from "../schemas/job-card-action-completion.schema";
import { JobCardAttachmentSchema } from "../schemas/job-card-attachment.schema";
import { JobCardBackgroundCompletionSchema } from "../schemas/job-card-background-completion.schema";
import { JobCardDocumentSchema } from "../schemas/job-card-document.schema";
import { JobCardImportJobSchema } from "../schemas/job-card-import-job.schema";
import { JobCardImportMappingSchema } from "../schemas/job-card-import-mapping.schema";
import { JobCardVersionSchema } from "../schemas/job-card-version.schema";
import { QaReviewDecisionSchema } from "../schemas/qa-review-decision.schema";
import { ReconciliationDocumentSchema } from "../schemas/reconciliation-document.schema";
import { ReconciliationEventSchema } from "../schemas/reconciliation-event.schema";
import { ReconciliationItemSchema } from "../schemas/reconciliation-item.schema";
import { RubberCuttingTrainingSchema } from "../schemas/rubber-cutting-training.schema";
import { RubberDimensionOverrideSchema } from "../schemas/rubber-dimension-override.schema";
import { StaffSignatureSchema } from "../schemas/staff-signature.schema";
import { StockControlCompanySchema } from "../schemas/stock-control-company.schema";
import { StockReturnSchema } from "../schemas/stock-return.schema";
import { WorkflowStepConfigSchema } from "../schemas/workflow-step-config.schema";
import { BackgroundStepService } from "../services/background-step.service";
import { DispatchService } from "../services/dispatch.service";
import { DispatchCdnService } from "../services/dispatch-cdn.service";
import { DispatchLoadPhotoService } from "../services/dispatch-load-photo.service";
import { DrawingExtractionService } from "../services/drawing-extraction.service";
import { InspectionBookingService } from "../services/inspection-booking.service";
import { JobCardService } from "../services/job-card.service";
import { JobCardAllocationService } from "../services/job-card-allocation.service";
import { JobCardImportService } from "../services/job-card-import.service";
import { JobCardImportJobService } from "../services/job-card-import-job.service";
import { JobCardPdfService } from "../services/job-card-pdf.service";
import { JobCardVersionService } from "../services/job-card-version.service";
import { JobCardWorkflowService } from "../services/job-card-workflow.service";
import { JobFileService } from "../services/job-file.service";
import { QaProcessService } from "../services/qa-process.service";
import { ReconciliationService } from "../services/reconciliation.service";
import { ReconciliationDocumentService } from "../services/reconciliation-document.service";
import { ReconciliationExtractionService } from "../services/reconciliation-extraction.service";
import { RubberCuttingTrainingService } from "../services/rubber-cutting-training.service";
import { SignatureService } from "../services/signature.service";
import { StockAllocationService } from "../services/stock-allocation.service";
import { WorkflowStepConfigService } from "../services/workflow-step-config.service";
import { WorkflowNotificationModule } from "../workflow-notification/workflow-notification.module";

@Module({
  imports: [
    StockControlCoreModule,
    RequisitionModule,
    QcModule,
    NixModule,
    MetricsModule,
    StorageModule,
    CpoModule,
    M2CalculationModule,
    WorkflowNotificationModule,
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
    MongooseModule.forFeature([
      { name: "DispatchCdn", schema: DispatchCdnSchema },
      { name: "DispatchLoadPhoto", schema: DispatchLoadPhotoSchema },
      { name: "DispatchScan", schema: DispatchScanSchema },
      {
        name: "JobCardActionCompletion",
        schema: JobCardActionCompletionSchema,
      },
      { name: "JobCardAttachment", schema: JobCardAttachmentSchema },
      {
        name: "JobCardBackgroundCompletion",
        schema: JobCardBackgroundCompletionSchema,
      },
      { name: "JobCardDocument", schema: JobCardDocumentSchema },
      { name: "JobCardImportJob", schema: JobCardImportJobSchema },
      { name: "JobCardImportMapping", schema: JobCardImportMappingSchema },
      { name: "JobCardVersion", schema: JobCardVersionSchema },
      { name: "QaReviewDecision", schema: QaReviewDecisionSchema },
      { name: "ReconciliationDocument", schema: ReconciliationDocumentSchema },
      { name: "ReconciliationEvent", schema: ReconciliationEventSchema },
      { name: "ReconciliationItem", schema: ReconciliationItemSchema },
      { name: "RubberCuttingTraining", schema: RubberCuttingTrainingSchema },
      { name: "RubberDimensionOverride", schema: RubberDimensionOverrideSchema },
      { name: "StaffSignature", schema: StaffSignatureSchema },
      { name: "StockReturn", schema: StockReturnSchema },
      { name: "WorkflowStepConfig", schema: WorkflowStepConfigSchema },
      { name: "StockControlCompany", schema: StockControlCompanySchema },
      { name: "InspectionBooking", schema: InspectionBookingSchema },
    ]),
  ],
  controllers: [
    JobCardsController,
    JobCardImportController,
    WorkflowController,
    ReconciliationController,
    SignatureController,
    InspectionPublicController,
  ],
  providers: [
    JobCardService,
    JobCardAllocationService,
    StockAllocationService,
    DispatchService,
    DispatchCdnService,
    DispatchLoadPhotoService,
    JobCardWorkflowService,
    JobCardVersionService,
    JobFileService,
    BackgroundStepService,
    RubberCuttingTrainingService,
    DrawingExtractionService,
    JobCardImportService,
    JobCardImportJobService,
    JobCardPdfService,
    WorkflowStepConfigService,
    QaProcessService,
    SignatureService,
    InspectionBookingService,
    ReconciliationService,
    ReconciliationDocumentService,
    ReconciliationExtractionService,
    repositoryProvider(DispatchCdnRepository, MongoDispatchCdnRepository),
    repositoryProvider(DispatchLoadPhotoRepository, MongoDispatchLoadPhotoRepository),
    repositoryProvider(DispatchScanRepository, MongoDispatchScanRepository),
    repositoryProvider(JobCardActionCompletionRepository, MongoJobCardActionCompletionRepository),
    repositoryProvider(JobCardAttachmentRepository, MongoJobCardAttachmentRepository),
    repositoryProvider(
      JobCardBackgroundCompletionRepository,
      MongoJobCardBackgroundCompletionRepository,
    ),
    repositoryProvider(JobCardDocumentRepository, MongoJobCardDocumentRepository),
    repositoryProvider(JobCardImportJobRepository, MongoJobCardImportJobRepository),
    repositoryProvider(JobCardImportMappingRepository, MongoJobCardImportMappingRepository),
    repositoryProvider(JobCardVersionRepository, MongoJobCardVersionRepository),
    repositoryProvider(QaReviewDecisionRepository, MongoQaReviewDecisionRepository),
    repositoryProvider(ReconciliationDocumentRepository, MongoReconciliationDocumentRepository),
    repositoryProvider(ReconciliationEventRepository, MongoReconciliationEventRepository),
    repositoryProvider(ReconciliationItemRepository, MongoReconciliationItemRepository),
    repositoryProvider(RubberCuttingTrainingRepository, MongoRubberCuttingTrainingRepository),
    repositoryProvider(RubberDimensionOverrideRepository, MongoRubberDimensionOverrideRepository),
    repositoryProvider(StaffSignatureRepository, MongoStaffSignatureRepository),
    repositoryProvider(StockReturnRepository, MongoStockReturnRepository),
    repositoryProvider(WorkflowStepConfigRepository, MongoWorkflowStepConfigRepository),
    repositoryProvider(InspectionBookingRepository, MongoInspectionBookingRepository),
  ],
  exports: [JobCardService, JobCardImportService],
})
export class JobCardsModule {}
