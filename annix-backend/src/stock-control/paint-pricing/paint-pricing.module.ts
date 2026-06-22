import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { CoatingSpecificationModule } from "../../coating-specification/coating-specification.module";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { MetricsModule } from "../../metrics/metrics.module";
import { NixModule } from "../../nix/nix.module";
import { PaintPricingController } from "../controllers/paint-pricing.controller";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { PaintPriceListItemRepository } from "../repositories/paint-price-list-item.repository";
import { MongoPaintPriceListItemRepository } from "../repositories/paint-price-list-item.repository.mongo";
import { StockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository";
import { MongoStockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository.mongo";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../repositories/stock-control-company.repository.mongo";
import { StockControlProfileRepository } from "../repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../repositories/stock-control-profile.repository.mongo";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../repositories/stock-control-user.repository.mongo";
import { PaintPriceListItemSchema } from "../schemas/paint-price-list-item.schema";
import { StockControlActionPermissionSchema } from "../schemas/stock-control-action-permission.schema";
import { StockControlCompanySchema } from "../schemas/stock-control-company.schema";
import { StockControlProfileSchema } from "../schemas/stock-control-profile.schema";
import { StockControlUserSchema } from "../schemas/stock-control-user.schema";
import { ActionPermissionService } from "../services/action-permission.service";
import { PaintCoatingSystemService } from "../services/paint-coating-system.service";
import { PaintPriceListService } from "../services/paint-price-list.service";
import { PaintPriceListExtractionService } from "../services/paint-price-list-extraction.service";
import { PaintPricingService } from "../services/paint-pricing.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "PaintPriceListItem", schema: PaintPriceListItemSchema },
      { name: "StockControlActionPermission", schema: StockControlActionPermissionSchema },
      { name: "StockControlCompany", schema: StockControlCompanySchema },
      { name: "StockControlProfile", schema: StockControlProfileSchema },
      { name: "StockControlUser", schema: StockControlUserSchema },
    ]),
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
    CoatingSpecificationModule,
    MetricsModule,
    NixModule,
  ],
  controllers: [PaintPricingController],
  providers: [
    StockControlAuthGuard,
    StockControlRoleGuard,
    StockControlOnboardingGuard,
    ActionPermissionService,
    PaintPricingService,
    PaintPriceListService,
    PaintPriceListExtractionService,
    PaintCoatingSystemService,
    repositoryProvider(PaintPriceListItemRepository, MongoPaintPriceListItemRepository),
    repositoryProvider(
      StockControlActionPermissionRepository,
      MongoStockControlActionPermissionRepository,
    ),
    repositoryProvider(StockControlCompanyRepository, MongoStockControlCompanyRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
  ],
})
export class PaintPricingModule {}
