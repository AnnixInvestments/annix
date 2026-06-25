import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { AppRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import { MongoAppRepository, MongoUserAppAccessRepository } from "../rbac/rbac.repository.mongo";
import { AppSchema } from "../rbac/schemas/app.schema";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { StockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.mongo";
import { StockControlProfileSchema } from "../stock-control/schemas/stock-control-profile.schema";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { SageExportAuthGuard } from "./guards/sage-export-auth.guard";
import { SageAdapterRegistry } from "./sage-adapter-registry.service";
import { SageApiService } from "./sage-api.service";
import { SageConnectionRepository } from "./sage-connection.repository";
import { MongoSageConnectionRepository } from "./sage-connection.repository.mongo";
import { SageConnectionService } from "./sage-connection.service";
import { SageExportController } from "./sage-export.controller";
import { SageExportService } from "./sage-export.service";
import { SageConnectionSchema } from "./schemas/sage-connection.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "SageConnection", schema: SageConnectionSchema },
      { name: "StockControlProfile", schema: StockControlProfileSchema },
      { name: "User", schema: UserSchema },
      { name: "App", schema: AppSchema },
      { name: "UserAppAccess", schema: UserAppAccessSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
      }),
    }),
  ],
  controllers: [SageExportController],
  providers: [
    SageExportService,
    SageApiService,
    SageConnectionService,
    SageAdapterRegistry,
    SageExportAuthGuard,
    repositoryProvider(SageConnectionRepository, MongoSageConnectionRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(AppRepository, MongoAppRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
  ],
  exports: [SageExportService, SageApiService, SageConnectionService, SageAdapterRegistry],
})
export class SageExportModule {}
