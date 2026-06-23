import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { MetricsModule } from "../../metrics/metrics.module";
import { NixModule } from "../../nix/nix.module";
import { RubberBondingAgentController } from "../controllers/rubber-bonding-agent.controller";
import { RubberPricingController } from "../controllers/rubber-pricing.controller";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { RubberBondingAgentRepository } from "../repositories/rubber-bonding-agent.repository";
import { MongoRubberBondingAgentRepository } from "../repositories/rubber-bonding-agent.repository.mongo";
import { RubberPriceListItemRepository } from "../repositories/rubber-price-list-item.repository";
import { MongoRubberPriceListItemRepository } from "../repositories/rubber-price-list-item.repository.mongo";
import { StockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository";
import { MongoStockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository.mongo";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../repositories/stock-control-company.repository.mongo";
import { StockControlProfileRepository } from "../repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../repositories/stock-control-profile.repository.mongo";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../repositories/stock-control-user.repository.mongo";
import { RubberBondingAgentSchema } from "../schemas/rubber-bonding-agent.schema";
import { RubberPriceListItemSchema } from "../schemas/rubber-price-list-item.schema";
import { StockControlActionPermissionSchema } from "../schemas/stock-control-action-permission.schema";
import { StockControlCompanySchema } from "../schemas/stock-control-company.schema";
import { StockControlProfileSchema } from "../schemas/stock-control-profile.schema";
import { StockControlUserSchema } from "../schemas/stock-control-user.schema";
import { ActionPermissionService } from "../services/action-permission.service";
import { RubberBondingAgentService } from "../services/rubber-bonding-agent.service";
import { RubberPriceListService } from "../services/rubber-price-list.service";
import { RubberPriceListExtractionService } from "../services/rubber-price-list-extraction.service";
import { RubberPricingService } from "../services/rubber-pricing.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "RubberPriceListItem", schema: RubberPriceListItemSchema },
      { name: "RubberBondingAgent", schema: RubberBondingAgentSchema },
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
    MetricsModule,
    NixModule,
  ],
  controllers: [RubberPricingController, RubberBondingAgentController],
  providers: [
    StockControlAuthGuard,
    StockControlRoleGuard,
    StockControlOnboardingGuard,
    ActionPermissionService,
    RubberPricingService,
    RubberPriceListService,
    RubberPriceListExtractionService,
    RubberBondingAgentService,
    repositoryProvider(RubberPriceListItemRepository, MongoRubberPriceListItemRepository),
    repositoryProvider(RubberBondingAgentRepository, MongoRubberBondingAgentRepository),
    repositoryProvider(
      StockControlActionPermissionRepository,
      MongoStockControlActionPermissionRepository,
    ),
    repositoryProvider(StockControlCompanyRepository, MongoStockControlCompanyRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
  ],
})
export class RubberPricingModule {}
