import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NbOdLookupModule } from "../nb-od-lookup/nb-od-lookup.module";
import { NixModule } from "../nix/nix.module";
import { PipeScheduleModule } from "../pipe-schedule/pipe-schedule.module";
import { QrCodeController } from "./controllers/qr-code.controller";
import { StockControlAuthController } from "./controllers/auth.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { DeliveriesController } from "./controllers/deliveries.controller";
import { ImportController } from "./controllers/import.controller";
import { InventoryController } from "./controllers/inventory.controller";
import { InvitationController } from "./controllers/invitation.controller";
import { JobCardImportController } from "./controllers/job-card-import.controller";
import { JobCardsController } from "./controllers/job-cards.controller";
import { MovementsController } from "./controllers/movements.controller";
import { ReportsController } from "./controllers/reports.controller";
import { RequisitionsController } from "./controllers/requisitions.controller";
import { JobCardCoatingAnalysis } from "./entities/coating-analysis.entity";
import { DeliveryNote } from "./entities/delivery-note.entity";
import { DeliveryNoteItem } from "./entities/delivery-note-item.entity";
import { JobCard } from "./entities/job-card.entity";
import { JobCardImportMapping } from "./entities/job-card-import-mapping.entity";
import { JobCardLineItem } from "./entities/job-card-line-item.entity";
import { Requisition } from "./entities/requisition.entity";
import { RequisitionItem } from "./entities/requisition-item.entity";
import { StockAllocation } from "./entities/stock-allocation.entity";
import { StockControlCompany } from "./entities/stock-control-company.entity";
import { StockControlInvitation } from "./entities/stock-control-invitation.entity";
import { StockControlUser } from "./entities/stock-control-user.entity";
import { StockItem } from "./entities/stock-item.entity";
import { StockMovement } from "./entities/stock-movement.entity";
import { StockControlAuthGuard } from "./guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "./guards/stock-control-role.guard";
import { StockControlAuthService } from "./services/auth.service";
import { BrandingScraperService } from "./services/branding-scraper.service";
import { CoatingAnalysisService } from "./services/coating-analysis.service";
import { DashboardService } from "./services/dashboard.service";
import { DeliveryService } from "./services/delivery.service";
import { ImportService } from "./services/import.service";
import { InventoryService } from "./services/inventory.service";
import { StockControlInvitationService } from "./services/invitation.service";
import { JobCardService } from "./services/job-card.service";
import { JobCardImportService } from "./services/job-card-import.service";
import { M2CalculationService } from "./services/m2-calculation.service";
import { QrCodeService } from "./services/qr-code.service";
import { MovementService } from "./services/movement.service";
import { ReportsService } from "./services/reports.service";
import { RequisitionService } from "./services/requisition.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockControlUser,
      StockControlCompany,
      StockControlInvitation,
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
    ]),
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
    NixModule,
    NbOdLookupModule,
    PipeScheduleModule,
  ],
  controllers: [
    StockControlAuthController,
    InventoryController,
    JobCardsController,
    DeliveriesController,
    MovementsController,
    ImportController,
    JobCardImportController,
    DashboardController,
    ReportsController,
    InvitationController,
    RequisitionsController,
    QrCodeController,
  ],
  providers: [
    StockControlAuthGuard,
    StockControlRoleGuard,
    StockControlAuthService,
    BrandingScraperService,
    StockControlInvitationService,
    InventoryService,
    JobCardService,
    DeliveryService,
    MovementService,
    ImportService,
    JobCardImportService,
    M2CalculationService,
    CoatingAnalysisService,
    DashboardService,
    ReportsService,
    RequisitionService,
    QrCodeService,
  ],
})
export class StockControlModule {}
