import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../storage/storage.module";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { IssuanceBatchRecord } from "../entities/issuance-batch-record.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardDataBook } from "../entities/job-card-data-book.entity";
import { PushSubscription } from "../entities/push-subscription.entity";
import { StockControlActionPermission } from "../entities/stock-control-action-permission.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockControlUser } from "../entities/stock-control-user.entity";
import { StockItem } from "../entities/stock-item.entity";
import { SupplierCertificate } from "../entities/supplier-certificate.entity";
import { WorkflowNotification } from "../entities/workflow-notification.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
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
import { QcBlastProfile } from "./entities/qc-blast-profile.entity";
import { QcControlPlan } from "./entities/qc-control-plan.entity";
import { QcDefelskoBatch } from "./entities/qc-defelsko-batch.entity";
import { QcDftReading } from "./entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "./entities/qc-dust-debris-test.entity";
import { QcEnvironmentalRecord } from "./entities/qc-environmental-record.entity";
import { QcItemsRelease } from "./entities/qc-items-release.entity";
import { QcPullTest } from "./entities/qc-pull-test.entity";
import { QcReleaseCertificate } from "./entities/qc-release-certificate.entity";
import { QcShoreHardness } from "./entities/qc-shore-hardness.entity";
import { QcpApprovalToken } from "./entities/qcp-approval-token.entity";
import { QcpCustomerPreference } from "./entities/qcp-customer-preference.entity";
import { QcEnabledGuard } from "./guards/qc-enabled.guard";
import { CalibrationCertificateService } from "./services/calibration-certificate.service";
import { PositectorService } from "./services/positector.service";
import { PositectorImportService } from "./services/positector-import.service";
import { PositectorStreamingService } from "./services/positector-streaming.service";
import { QcMeasurementService } from "./services/qc-measurement.service";
import { QcpApprovalService } from "./services/qcp-approval.service";
import { WORK_ITEM_PROVIDER } from "./work-item-provider.interface";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalibrationCertificate,
      CustomerPurchaseOrder,
      CustomerPurchaseOrderItem,
      IssuanceBatchRecord,
      JobCard,
      JobCardCoatingAnalysis,
      JobCardDataBook,
      PositectorDevice,
      PushSubscription,
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
      StockControlCompany,
      StockControlActionPermission,
      StockControlSupplier,
      StockControlUser,
      StockItem,
      SupplierCertificate,
      WorkflowNotification,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET", "stock-control-jwt-secret"),
        signOptions: { expiresIn: "1h" },
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
    QcMeasurementService,
    QcpApprovalService,
    PositectorService,
    PositectorImportService,
    PositectorStreamingService,
    WebPushService,
    { provide: WORK_ITEM_PROVIDER, useClass: JobCardWorkItemProvider },
  ],
  exports: [QcMeasurementService, CalibrationCertificateService, TypeOrmModule],
})
export class QcModule {}
