import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../storage/storage.module";
import { JobCard } from "../entities/job-card.entity";
import { PushSubscription } from "../entities/push-subscription.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockControlUser } from "../entities/stock-control-user.entity";
import { WorkflowNotification } from "../entities/workflow-notification.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { CompanyEmailService } from "../services/company-email.service";
import { JobCardWorkItemProvider } from "../services/job-card-work-item-provider";
import { WebPushService } from "../services/web-push.service";
import { CalibrationCertificateController } from "./controllers/calibration-certificate.controller";
import { PositectorController } from "./controllers/positector.controller";
import { PositectorStreamingController } from "./controllers/positector-streaming.controller";
import { QcMeasurementController } from "./controllers/qc-measurement.controller";
import { CalibrationCertificate } from "./entities/calibration-certificate.entity";
import { PositectorDevice } from "./entities/positector-device.entity";
import { QcBlastProfile } from "./entities/qc-blast-profile.entity";
import { QcControlPlan } from "./entities/qc-control-plan.entity";
import { QcDftReading } from "./entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "./entities/qc-dust-debris-test.entity";
import { QcItemsRelease } from "./entities/qc-items-release.entity";
import { QcPullTest } from "./entities/qc-pull-test.entity";
import { QcReleaseCertificate } from "./entities/qc-release-certificate.entity";
import { QcShoreHardness } from "./entities/qc-shore-hardness.entity";
import { QcEnabledGuard } from "./guards/qc-enabled.guard";
import { CalibrationCertificateService } from "./services/calibration-certificate.service";
import { PositectorService } from "./services/positector.service";
import { PositectorImportService } from "./services/positector-import.service";
import { PositectorStreamingService } from "./services/positector-streaming.service";
import { QcMeasurementService } from "./services/qc-measurement.service";
import { WORK_ITEM_PROVIDER } from "./work-item-provider.interface";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalibrationCertificate,
      JobCard,
      PositectorDevice,
      PushSubscription,
      QcBlastProfile,
      QcControlPlan,
      QcDftReading,
      QcDustDebrisTest,
      QcItemsRelease,
      QcPullTest,
      QcReleaseCertificate,
      QcShoreHardness,
      StockControlCompany,
      StockControlUser,
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
    QcMeasurementController,
    PositectorController,
    PositectorStreamingController,
  ],
  providers: [
    StockControlAuthGuard,
    StockControlRoleGuard,
    QcEnabledGuard,
    CalibrationCertificateService,
    CompanyEmailService,
    QcMeasurementService,
    PositectorService,
    PositectorImportService,
    PositectorStreamingService,
    WebPushService,
    { provide: WORK_ITEM_PROVIDER, useClass: JobCardWorkItemProvider },
  ],
  exports: [QcMeasurementService, CalibrationCertificateService, TypeOrmModule],
})
export class QcModule {}
