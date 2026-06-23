import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { StorageModule } from "../../storage/storage.module";
import { SupplierController } from "../controllers/supplier.controller";
import { SupplierDocumentController } from "../controllers/supplier-document.controller";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { StockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository";
import { MongoStockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository.mongo";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../repositories/stock-control-company.repository.mongo";
import { StockControlProfileRepository } from "../repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../repositories/stock-control-profile.repository.mongo";
import { StockControlSupplierRepository } from "../repositories/stock-control-supplier.repository";
import { MongoStockControlSupplierRepository } from "../repositories/stock-control-supplier.repository.mongo";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../repositories/stock-control-user.repository.mongo";
import { SupplierDocumentRepository } from "../repositories/supplier-document.repository";
import { MongoSupplierDocumentRepository } from "../repositories/supplier-document.repository.mongo";
import { StockControlActionPermissionSchema } from "../schemas/stock-control-action-permission.schema";
import { StockControlCompanySchema } from "../schemas/stock-control-company.schema";
import { StockControlProfileSchema } from "../schemas/stock-control-profile.schema";
import { StockControlSupplierSchema } from "../schemas/stock-control-supplier.schema";
import { StockControlUserSchema } from "../schemas/stock-control-user.schema";
import { SupplierDocumentSchema } from "../schemas/supplier-document.schema";
import { ActionPermissionService } from "../services/action-permission.service";
import { SupplierDocumentService } from "../services/supplier-document.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "StockControlSupplier", schema: StockControlSupplierSchema },
      { name: "SupplierDocument", schema: SupplierDocumentSchema },
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
    StorageModule,
  ],
  controllers: [SupplierController, SupplierDocumentController],
  providers: [
    StockControlAuthGuard,
    StockControlRoleGuard,
    StockControlOnboardingGuard,
    ActionPermissionService,
    SupplierDocumentService,
    repositoryProvider(StockControlSupplierRepository, MongoStockControlSupplierRepository),
    repositoryProvider(SupplierDocumentRepository, MongoSupplierDocumentRepository),
    repositoryProvider(
      StockControlActionPermissionRepository,
      MongoStockControlActionPermissionRepository,
    ),
    repositoryProvider(StockControlCompanyRepository, MongoStockControlCompanyRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
  ],
})
export class SuppliersModule {}
