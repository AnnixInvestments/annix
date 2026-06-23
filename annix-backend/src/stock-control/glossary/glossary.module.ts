import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { GlossaryController } from "../controllers/glossary.controller";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { GlossaryTermRepository } from "../repositories/glossary-term.repository";
import { MongoGlossaryTermRepository } from "../repositories/glossary-term.repository.mongo";
import { StockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository";
import { MongoStockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository.mongo";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../repositories/stock-control-company.repository.mongo";
import { StockControlProfileRepository } from "../repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../repositories/stock-control-profile.repository.mongo";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../repositories/stock-control-user.repository.mongo";
import { GlossaryTermSchema } from "../schemas/glossary-term.schema";
import { StockControlActionPermissionSchema } from "../schemas/stock-control-action-permission.schema";
import { StockControlCompanySchema } from "../schemas/stock-control-company.schema";
import { StockControlProfileSchema } from "../schemas/stock-control-profile.schema";
import { StockControlUserSchema } from "../schemas/stock-control-user.schema";
import { ActionPermissionService } from "../services/action-permission.service";
import { GlossaryService } from "../services/glossary.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "GlossaryTerm", schema: GlossaryTermSchema },
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
  ],
  controllers: [GlossaryController],
  providers: [
    StockControlAuthGuard,
    StockControlRoleGuard,
    StockControlOnboardingGuard,
    ActionPermissionService,
    GlossaryService,
    repositoryProvider(GlossaryTermRepository, MongoGlossaryTermRepository),
    repositoryProvider(
      StockControlActionPermissionRepository,
      MongoStockControlActionPermissionRepository,
    ),
    repositoryProvider(StockControlCompanyRepository, MongoStockControlCompanyRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
  ],
})
export class GlossaryModule {}
