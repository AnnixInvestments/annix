import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StockControlAuthController } from "./controllers/auth.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { DeliveriesController } from "./controllers/deliveries.controller";
import { ImportController } from "./controllers/import.controller";
import { InventoryController } from "./controllers/inventory.controller";
import { InvitationController } from "./controllers/invitation.controller";
import { JobCardsController } from "./controllers/job-cards.controller";
import { MovementsController } from "./controllers/movements.controller";
import { ReportsController } from "./controllers/reports.controller";
import { DeliveryNote } from "./entities/delivery-note.entity";
import { DeliveryNoteItem } from "./entities/delivery-note-item.entity";
import { JobCard } from "./entities/job-card.entity";
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
import { DashboardService } from "./services/dashboard.service";
import { DeliveryService } from "./services/delivery.service";
import { ImportService } from "./services/import.service";
import { InventoryService } from "./services/inventory.service";
import { StockControlInvitationService } from "./services/invitation.service";
import { JobCardService } from "./services/job-card.service";
import { MovementService } from "./services/movement.service";
import { ReportsService } from "./services/reports.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockControlUser,
      StockControlCompany,
      StockControlInvitation,
      StockItem,
      JobCard,
      StockAllocation,
      DeliveryNote,
      DeliveryNoteItem,
      StockMovement,
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
  ],
  controllers: [
    StockControlAuthController,
    InventoryController,
    JobCardsController,
    DeliveriesController,
    MovementsController,
    ImportController,
    DashboardController,
    ReportsController,
    InvitationController,
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
    DashboardService,
    ReportsService,
  ],
})
export class StockControlModule {}
