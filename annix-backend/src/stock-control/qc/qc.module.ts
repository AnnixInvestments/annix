import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { Company } from "../../platform/entities/company.entity";
import { StorageModule } from "../../storage/storage.module";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { IssuanceBatchRecord } from "../entities/issuance-batch-record.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardDataBook } from "../entities/job-card-data-book.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { PushSubscription } from "../entities/push-subscription.entity";
import { StockControlActionPermission } from "../entities/stock-control-action-permission.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockControlProfile } from "../entities/stock-control-profile.entity";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockControlUser } from "../entities/stock-control-user.entity";
import { StockItem } from "../entities/stock-item.entity";
import { SupplierCertificate } from "../entities/supplier-certificate.entity";
import { WorkflowNotification } from "../entities/workflow-notification.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { JobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository";
import { MongoJobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository.mongo";
import { PostgresJobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository.postgres";
import { CustomerPurchaseOrderRepository } from "../repositories/customer-purchase-order.repository";
import { MongoCustomerPurchaseOrderRepository } from "../repositories/customer-purchase-order.repository.mongo";
import { PostgresCustomerPurchaseOrderRepository } from "../repositories/customer-purchase-order.repository.postgres";
import { IssuanceBatchRecordRepository } from "../repositories/issuance-batch-record.repository";
import { MongoIssuanceBatchRecordRepository } from "../repositories/issuance-batch-record.repository.mongo";
import { PostgresIssuanceBatchRecordRepository } from "../repositories/issuance-batch-record.repository.postgres";
import { JobCardRepository } from "../repositories/job-card.repository";
import { MongoJobCardRepository } from "../repositories/job-card.repository.mongo";
import { PostgresJobCardRepository } from "../repositories/job-card.repository.postgres";
import { JobCardDataBookRepository } from "../repositories/job-card-data-book.repository";
import { MongoJobCardDataBookRepository } from "../repositories/job-card-data-book.repository.mongo";
import { PostgresJobCardDataBookRepository } from "../repositories/job-card-data-book.repository.postgres";
import { JobCardLineItemRepository } from "../repositories/job-card-line-item.repository";
import { MongoJobCardLineItemRepository } from "../repositories/job-card-line-item.repository.mongo";
import { PostgresJobCardLineItemRepository } from "../repositories/job-card-line-item.repository.postgres";
import { PushSubscriptionRepository } from "../repositories/push-subscription.repository";
import { MongoPushSubscriptionRepository } from "../repositories/push-subscription.repository.mongo";
import { PostgresPushSubscriptionRepository } from "../repositories/push-subscription.repository.postgres";
import { StockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository";
import { MongoStockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository.mongo";
import { PostgresStockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository.postgres";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../repositories/stock-control-company.repository.mongo";
import { PostgresStockControlCompanyRepository } from "../repositories/stock-control-company.repository.postgres";
import { StockControlProfileRepository } from "../repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../repositories/stock-control-profile.repository.mongo";
import { PostgresStockControlProfileRepository } from "../repositories/stock-control-profile.repository.postgres";
import { StockControlSupplierRepository } from "../repositories/stock-control-supplier.repository";
import { MongoStockControlSupplierRepository } from "../repositories/stock-control-supplier.repository.mongo";
import { PostgresStockControlSupplierRepository } from "../repositories/stock-control-supplier.repository.postgres";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../repositories/stock-control-user.repository.mongo";
import { PostgresStockControlUserRepository } from "../repositories/stock-control-user.repository.postgres";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { MongoStockItemRepository } from "../repositories/stock-item.repository.mongo";
import { PostgresStockItemRepository } from "../repositories/stock-item.repository.postgres";
import { SupplierCertificateRepository } from "../repositories/supplier-certificate.repository";
import { MongoSupplierCertificateRepository } from "../repositories/supplier-certificate.repository.mongo";
import { PostgresSupplierCertificateRepository } from "../repositories/supplier-certificate.repository.postgres";
import { WorkflowNotificationRepository } from "../repositories/workflow-notification.repository";
import { MongoWorkflowNotificationRepository } from "../repositories/workflow-notification.repository.mongo";
import { PostgresWorkflowNotificationRepository } from "../repositories/workflow-notification.repository.postgres";
import { CustomerPurchaseOrderSchema } from "../schemas/customer-purchase-order.schema";
import { IssuanceBatchRecordSchema } from "../schemas/issuance-batch-record.schema";
import { JobCardSchema } from "../schemas/job-card.schema";
import { JobCardCoatingAnalysisSchema } from "../schemas/job-card-coating-analysis.schema";
import { JobCardDataBookSchema } from "../schemas/job-card-data-book.schema";
import { JobCardLineItemSchema } from "../schemas/job-card-line-item.schema";
import { PushSubscriptionSchema } from "../schemas/push-subscription.schema";
import { StockControlActionPermissionSchema } from "../schemas/stock-control-action-permission.schema";
import { StockControlCompanySchema } from "../schemas/stock-control-company.schema";
import { StockControlProfileSchema } from "../schemas/stock-control-profile.schema";
import { StockControlSupplierSchema } from "../schemas/stock-control-supplier.schema";
import { StockControlUserSchema } from "../schemas/stock-control-user.schema";
import { StockItemSchema } from "../schemas/stock-item.schema";
import { SupplierCertificateSchema } from "../schemas/supplier-certificate.schema";
import { WorkflowNotificationSchema } from "../schemas/workflow-notification.schema";
import { ActionPermissionService } from "../services/action-permission.service";
import { CertificateService } from "../services/certificate.service";
import { CompanyEmailService } from "../services/company-email.service";
import { DataBookPdfService } from "../services/data-book-pdf.service";
import { JobCardWorkItemProvider } from "../services/job-card-work-item-provider";
import { WebPushService } from "../services/web-push.service";
import { CalibrationCertificateController } from "./controllers/calibration-certificate.controller";
import { CpoQcController } from "./controllers/cpo-qc.controller";
import { EnvironmentalController } from "./controllers/environmental.controller";
import { PositectorController } from "./controllers/positector.controller";
import { PositectorStreamingController } from "./controllers/positector-streaming.controller";
import { QcMeasurementController } from "./controllers/qc-measurement.controller";
import { QcRecordsController } from "./controllers/qc-records.controller";
import { QcpLogController } from "./controllers/qcp-log.controller";
import { QcpPublicController } from "./controllers/qcp-public.controller";
import { CalibrationCertificate } from "./entities/calibration-certificate.entity";
import { PositectorDevice } from "./entities/positector-device.entity";
import { PositectorUpload } from "./entities/positector-upload.entity";
import { QcBatchAssignment } from "./entities/qc-batch-assignment.entity";
import { QcBlastProfile } from "./entities/qc-blast-profile.entity";
import { QcControlPlan } from "./entities/qc-control-plan.entity";
import { QcDefelskoBatch } from "./entities/qc-defelsko-batch.entity";
import { QcDftReading } from "./entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "./entities/qc-dust-debris-test.entity";
import { QcEnvironmentalBatchLink } from "./entities/qc-environmental-batch-link.entity";
import { QcEnvironmentalRecord } from "./entities/qc-environmental-record.entity";
import { QcItemsRelease } from "./entities/qc-items-release.entity";
import { QcPullTest } from "./entities/qc-pull-test.entity";
import { QcReleaseCertificate } from "./entities/qc-release-certificate.entity";
import { QcShoreHardness } from "./entities/qc-shore-hardness.entity";
import { QcpApprovalToken } from "./entities/qcp-approval-token.entity";
import { QcpCustomerPreference } from "./entities/qcp-customer-preference.entity";
import { QcEnabledGuard } from "./guards/qc-enabled.guard";
import { CalibrationCertificateRepository } from "./repositories/calibration-certificate.repository";
import { MongoCalibrationCertificateRepository } from "./repositories/calibration-certificate.repository.mongo";
import { PostgresCalibrationCertificateRepository } from "./repositories/calibration-certificate.repository.postgres";
import { PositectorDeviceRepository } from "./repositories/positector-device.repository";
import { MongoPositectorDeviceRepository } from "./repositories/positector-device.repository.mongo";
import { PostgresPositectorDeviceRepository } from "./repositories/positector-device.repository.postgres";
import { PositectorUploadRepository } from "./repositories/positector-upload.repository";
import { MongoPositectorUploadRepository } from "./repositories/positector-upload.repository.mongo";
import { PostgresPositectorUploadRepository } from "./repositories/positector-upload.repository.postgres";
import { QcBatchAssignmentRepository } from "./repositories/qc-batch-assignment.repository";
import { MongoQcBatchAssignmentRepository } from "./repositories/qc-batch-assignment.repository.mongo";
import { PostgresQcBatchAssignmentRepository } from "./repositories/qc-batch-assignment.repository.postgres";
import { QcBlastProfileRepository } from "./repositories/qc-blast-profile.repository";
import { MongoQcBlastProfileRepository } from "./repositories/qc-blast-profile.repository.mongo";
import { PostgresQcBlastProfileRepository } from "./repositories/qc-blast-profile.repository.postgres";
import { QcControlPlanRepository } from "./repositories/qc-control-plan.repository";
import { MongoQcControlPlanRepository } from "./repositories/qc-control-plan.repository.mongo";
import { PostgresQcControlPlanRepository } from "./repositories/qc-control-plan.repository.postgres";
import { QcDefelskoBatchRepository } from "./repositories/qc-defelsko-batch.repository";
import { MongoQcDefelskoBatchRepository } from "./repositories/qc-defelsko-batch.repository.mongo";
import { PostgresQcDefelskoBatchRepository } from "./repositories/qc-defelsko-batch.repository.postgres";
import { QcDftReadingRepository } from "./repositories/qc-dft-reading.repository";
import { MongoQcDftReadingRepository } from "./repositories/qc-dft-reading.repository.mongo";
import { PostgresQcDftReadingRepository } from "./repositories/qc-dft-reading.repository.postgres";
import { QcDustDebrisTestRepository } from "./repositories/qc-dust-debris-test.repository";
import { MongoQcDustDebrisTestRepository } from "./repositories/qc-dust-debris-test.repository.mongo";
import { PostgresQcDustDebrisTestRepository } from "./repositories/qc-dust-debris-test.repository.postgres";
import { QcEnvironmentalBatchLinkRepository } from "./repositories/qc-environmental-batch-link.repository";
import { MongoQcEnvironmentalBatchLinkRepository } from "./repositories/qc-environmental-batch-link.repository.mongo";
import { PostgresQcEnvironmentalBatchLinkRepository } from "./repositories/qc-environmental-batch-link.repository.postgres";
import { QcEnvironmentalRecordRepository } from "./repositories/qc-environmental-record.repository";
import { MongoQcEnvironmentalRecordRepository } from "./repositories/qc-environmental-record.repository.mongo";
import { PostgresQcEnvironmentalRecordRepository } from "./repositories/qc-environmental-record.repository.postgres";
import { QcItemsReleaseRepository } from "./repositories/qc-items-release.repository";
import { MongoQcItemsReleaseRepository } from "./repositories/qc-items-release.repository.mongo";
import { PostgresQcItemsReleaseRepository } from "./repositories/qc-items-release.repository.postgres";
import { QcPullTestRepository } from "./repositories/qc-pull-test.repository";
import { MongoQcPullTestRepository } from "./repositories/qc-pull-test.repository.mongo";
import { PostgresQcPullTestRepository } from "./repositories/qc-pull-test.repository.postgres";
import { QcReleaseCertificateRepository } from "./repositories/qc-release-certificate.repository";
import { MongoQcReleaseCertificateRepository } from "./repositories/qc-release-certificate.repository.mongo";
import { PostgresQcReleaseCertificateRepository } from "./repositories/qc-release-certificate.repository.postgres";
import { QcShoreHardnessRepository } from "./repositories/qc-shore-hardness.repository";
import { MongoQcShoreHardnessRepository } from "./repositories/qc-shore-hardness.repository.mongo";
import { PostgresQcShoreHardnessRepository } from "./repositories/qc-shore-hardness.repository.postgres";
import { QcpApprovalTokenRepository } from "./repositories/qcp-approval-token.repository";
import { MongoQcpApprovalTokenRepository } from "./repositories/qcp-approval-token.repository.mongo";
import { PostgresQcpApprovalTokenRepository } from "./repositories/qcp-approval-token.repository.postgres";
import { QcpCustomerPreferenceRepository } from "./repositories/qcp-customer-preference.repository";
import { MongoQcpCustomerPreferenceRepository } from "./repositories/qcp-customer-preference.repository.mongo";
import { PostgresQcpCustomerPreferenceRepository } from "./repositories/qcp-customer-preference.repository.postgres";
import { CalibrationCertificateSchema } from "./schemas/calibration-certificate.schema";
import { PositectorDeviceSchema } from "./schemas/positector-device.schema";
import { PositectorUploadSchema } from "./schemas/positector-upload.schema";
import { QcBatchAssignmentSchema } from "./schemas/qc-batch-assignment.schema";
import { QcBlastProfileSchema } from "./schemas/qc-blast-profile.schema";
import { QcControlPlanSchema } from "./schemas/qc-control-plan.schema";
import { QcDefelskoBatchSchema } from "./schemas/qc-defelsko-batch.schema";
import { QcDftReadingSchema } from "./schemas/qc-dft-reading.schema";
import { QcDustDebrisTestSchema } from "./schemas/qc-dust-debris-test.schema";
import { QcEnvironmentalBatchLinkSchema } from "./schemas/qc-environmental-batch-link.schema";
import { QcEnvironmentalRecordSchema } from "./schemas/qc-environmental-record.schema";
import { QcItemsReleaseSchema } from "./schemas/qc-items-release.schema";
import { QcPullTestSchema } from "./schemas/qc-pull-test.schema";
import { QcReleaseCertificateSchema } from "./schemas/qc-release-certificate.schema";
import { QcShoreHardnessSchema } from "./schemas/qc-shore-hardness.schema";
import { QcpApprovalTokenSchema } from "./schemas/qcp-approval-token.schema";
import { QcpCustomerPreferenceSchema } from "./schemas/qcp-customer-preference.schema";
import { CalibrationCertificateService } from "./services/calibration-certificate.service";
import { PositectorService } from "./services/positector.service";
import { PositectorBundleSplitterService } from "./services/positector-bundle-splitter.service";
import { PositectorImportService } from "./services/positector-import.service";
import { PositectorStreamingService } from "./services/positector-streaming.service";
import { PositectorUploadService } from "./services/positector-upload.service";
import { QcBatchAssignmentService } from "./services/qc-batch-assignment.service";
import { QcMeasurementService } from "./services/qc-measurement.service";
import { QcpApprovalService } from "./services/qcp-approval.service";
import { WORK_ITEM_PROVIDER } from "./work-item-provider.interface";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "CalibrationCertificate", schema: CalibrationCertificateSchema },
            { name: "PositectorDevice", schema: PositectorDeviceSchema },
            { name: "PositectorUpload", schema: PositectorUploadSchema },
            { name: "QcBatchAssignment", schema: QcBatchAssignmentSchema },
            { name: "QcBlastProfile", schema: QcBlastProfileSchema },
            { name: "QcControlPlan", schema: QcControlPlanSchema },
            { name: "QcDefelskoBatch", schema: QcDefelskoBatchSchema },
            { name: "QcDftReading", schema: QcDftReadingSchema },
            { name: "QcDustDebrisTest", schema: QcDustDebrisTestSchema },
            { name: "QcEnvironmentalBatchLink", schema: QcEnvironmentalBatchLinkSchema },
            { name: "QcEnvironmentalRecord", schema: QcEnvironmentalRecordSchema },
            { name: "QcItemsRelease", schema: QcItemsReleaseSchema },
            { name: "QcPullTest", schema: QcPullTestSchema },
            { name: "QcReleaseCertificate", schema: QcReleaseCertificateSchema },
            { name: "QcShoreHardness", schema: QcShoreHardnessSchema },
            { name: "QcpApprovalToken", schema: QcpApprovalTokenSchema },
            { name: "QcpCustomerPreference", schema: QcpCustomerPreferenceSchema },
            { name: "JobCard", schema: JobCardSchema },
            { name: "JobCardLineItem", schema: JobCardLineItemSchema },
            { name: "JobCardCoatingAnalysis", schema: JobCardCoatingAnalysisSchema },
            { name: "CustomerPurchaseOrder", schema: CustomerPurchaseOrderSchema },
            { name: "StockControlActionPermission", schema: StockControlActionPermissionSchema },
            { name: "SupplierCertificate", schema: SupplierCertificateSchema },
            { name: "IssuanceBatchRecord", schema: IssuanceBatchRecordSchema },
            { name: "JobCardDataBook", schema: JobCardDataBookSchema },
            { name: "StockControlSupplier", schema: StockControlSupplierSchema },
            { name: "StockItem", schema: StockItemSchema },
            { name: "PushSubscription", schema: PushSubscriptionSchema },
            { name: "StockControlCompany", schema: StockControlCompanySchema },
            { name: "StockControlProfile", schema: StockControlProfileSchema },
            { name: "StockControlUser", schema: StockControlUserSchema },
            { name: "WorkflowNotification", schema: WorkflowNotificationSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            CalibrationCertificate,
            CustomerPurchaseOrder,
            CustomerPurchaseOrderItem,
            IssuanceBatchRecord,
            JobCard,
            JobCardCoatingAnalysis,
            JobCardLineItem,
            JobCardDataBook,
            PositectorDevice,
            PositectorUpload,
            PushSubscription,
            QcBatchAssignment,
            QcEnvironmentalBatchLink,
            QcBlastProfile,
            QcControlPlan,
            QcpApprovalToken,
            QcpCustomerPreference,
            QcDefelskoBatch,
            QcDftReading,
            QcDustDebrisTest,
            QcEnvironmentalRecord,
            QcItemsRelease,
            QcPullTest,
            QcReleaseCertificate,
            QcShoreHardness,
            Company,
            StockControlCompany,
            StockControlActionPermission,
            StockControlProfile,
            StockControlSupplier,
            StockControlUser,
            StockItem,
            SupplierCertificate,
            WorkflowNotification,
          ]),
        ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET", "stock-control-jwt-secret"),
        signOptions: { expiresIn: "8h" },
      }),
    }),
    StorageModule,
  ],
  controllers: [
    CalibrationCertificateController,
    CpoQcController,
    EnvironmentalController,
    QcMeasurementController,
    QcpLogController,
    QcpPublicController,
    PositectorController,
    PositectorStreamingController,
    QcRecordsController,
  ],
  providers: [
    ActionPermissionService,
    StockControlAuthGuard,
    StockControlRoleGuard,
    QcEnabledGuard,
    CalibrationCertificateService,
    CertificateService,
    CompanyEmailService,
    DataBookPdfService,
    QcBatchAssignmentService,
    QcMeasurementService,
    QcpApprovalService,
    PositectorService,
    PositectorBundleSplitterService,
    PositectorImportService,
    PositectorStreamingService,
    PositectorUploadService,
    WebPushService,
    { provide: WORK_ITEM_PROVIDER, useClass: JobCardWorkItemProvider },
    repositoryProvider(
      StockControlActionPermissionRepository,
      PostgresStockControlActionPermissionRepository,
      MongoStockControlActionPermissionRepository,
    ),
    repositoryProvider(
      SupplierCertificateRepository,
      PostgresSupplierCertificateRepository,
      MongoSupplierCertificateRepository,
    ),
    repositoryProvider(
      IssuanceBatchRecordRepository,
      PostgresIssuanceBatchRecordRepository,
      MongoIssuanceBatchRecordRepository,
    ),
    repositoryProvider(
      JobCardDataBookRepository,
      PostgresJobCardDataBookRepository,
      MongoJobCardDataBookRepository,
    ),
    repositoryProvider(
      StockControlSupplierRepository,
      PostgresStockControlSupplierRepository,
      MongoStockControlSupplierRepository,
    ),
    repositoryProvider(StockItemRepository, PostgresStockItemRepository, MongoStockItemRepository),
    repositoryProvider(
      PushSubscriptionRepository,
      PostgresPushSubscriptionRepository,
      MongoPushSubscriptionRepository,
    ),
    repositoryProvider(
      StockControlProfileRepository,
      PostgresStockControlProfileRepository,
      MongoStockControlProfileRepository,
    ),
    repositoryProvider(
      CalibrationCertificateRepository,
      PostgresCalibrationCertificateRepository,
      MongoCalibrationCertificateRepository,
    ),
    repositoryProvider(
      PositectorDeviceRepository,
      PostgresPositectorDeviceRepository,
      MongoPositectorDeviceRepository,
    ),
    repositoryProvider(
      PositectorUploadRepository,
      PostgresPositectorUploadRepository,
      MongoPositectorUploadRepository,
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
      QcEnvironmentalBatchLinkRepository,
      PostgresQcEnvironmentalBatchLinkRepository,
      MongoQcEnvironmentalBatchLinkRepository,
    ),
    repositoryProvider(
      QcEnvironmentalRecordRepository,
      PostgresQcEnvironmentalRecordRepository,
      MongoQcEnvironmentalRecordRepository,
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
    repositoryProvider(
      QcpApprovalTokenRepository,
      PostgresQcpApprovalTokenRepository,
      MongoQcpApprovalTokenRepository,
    ),
    repositoryProvider(
      QcpCustomerPreferenceRepository,
      PostgresQcpCustomerPreferenceRepository,
      MongoQcpCustomerPreferenceRepository,
    ),
    repositoryProvider(JobCardRepository, PostgresJobCardRepository, MongoJobCardRepository),
    repositoryProvider(
      JobCardLineItemRepository,
      PostgresJobCardLineItemRepository,
      MongoJobCardLineItemRepository,
    ),
    repositoryProvider(
      JobCardCoatingAnalysisRepository,
      PostgresJobCardCoatingAnalysisRepository,
      MongoJobCardCoatingAnalysisRepository,
    ),
    repositoryProvider(
      CustomerPurchaseOrderRepository,
      PostgresCustomerPurchaseOrderRepository,
      MongoCustomerPurchaseOrderRepository,
    ),
    repositoryProvider(
      StockControlCompanyRepository,
      PostgresStockControlCompanyRepository,
      MongoStockControlCompanyRepository,
    ),
    repositoryProvider(
      StockControlUserRepository,
      PostgresStockControlUserRepository,
      MongoStockControlUserRepository,
    ),
    repositoryProvider(
      WorkflowNotificationRepository,
      PostgresWorkflowNotificationRepository,
      MongoWorkflowNotificationRepository,
    ),
  ],
  exports: [
    QcBatchAssignmentService,
    QcMeasurementService,
    CalibrationCertificateService,
    PositectorUploadService,
    ...(isMongoDriver() ? [] : [TypeOrmModule]),
  ],
})
export class QcModule {}
