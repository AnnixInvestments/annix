import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AnnixOrbitProfile } from "../annix-orbit/entities/annix-orbit-profile.entity";
import { AnnixOrbitUser } from "../annix-orbit/entities/annix-orbit-user.entity";
import { AnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository";
import { MongoAnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository.mongo";
import { PostgresAnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository.postgres";
import { AnnixOrbitUserRepository } from "../annix-orbit/repositories/annix-orbit-user.repository";
import { MongoAnnixOrbitUserRepository } from "../annix-orbit/repositories/annix-orbit-user.repository.mongo";
import { PostgresAnnixOrbitUserRepository } from "../annix-orbit/repositories/annix-orbit-user.repository.postgres";
import { AnnixOrbitProfileSchema } from "../annix-orbit/schemas/annix-orbit-profile.schema";
import { AnnixOrbitUserSchema } from "../annix-orbit/schemas/annix-orbit-user.schema";
import { RepProfile } from "../annix-rep/rep-profile/rep-profile.entity";
import { RepProfileRepository } from "../annix-rep/rep-profile/rep-profile.repository";
import { MongoRepProfileRepository } from "../annix-rep/rep-profile/rep-profile.repository.mongo";
import { PostgresRepProfileRepository } from "../annix-rep/rep-profile/rep-profile.repository.postgres";
import { RepProfileSchema } from "../annix-rep/rep-profile/schemas/rep-profile.schema";
import { AnnixSentinelProfileRepository } from "../annix-sentinel/companies/annix-sentinel-profile.repository";
import { MongoAnnixSentinelProfileRepository } from "../annix-sentinel/companies/annix-sentinel-profile.repository.mongo";
import { PostgresAnnixSentinelProfileRepository } from "../annix-sentinel/companies/annix-sentinel-profile.repository.postgres";
import { AnnixSentinelProfile } from "../annix-sentinel/companies/entities/annix-sentinel-profile.entity";
import { AnnixSentinelProfileSchema } from "../annix-sentinel/companies/schemas/annix-sentinel-profile.schema";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { PostgresCustomerProfileRepository } from "../customer/customer-profile.repository.postgres";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { App } from "../rbac/entities/app.entity";
import { AppRole } from "../rbac/entities/app-role.entity";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { AppRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import { MongoAppRepository, MongoUserAppAccessRepository } from "../rbac/rbac.repository.mongo";
import {
  PostgresAppRepository,
  PostgresUserAppAccessRepository,
} from "../rbac/rbac.repository.postgres";
import { AppSchema } from "../rbac/schemas/app.schema";
import { AppRoleSchema } from "../rbac/schemas/app-role.schema";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { StockControlProfile } from "../stock-control/entities/stock-control-profile.entity";
import { StockControlUser } from "../stock-control/entities/stock-control-user.entity";
import { StockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.mongo";
import { PostgresStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.postgres";
import { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.mongo";
import { PostgresStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.postgres";
import { StockControlProfileSchema } from "../stock-control/schemas/stock-control-profile.schema";
import { StockControlUserSchema } from "../stock-control/schemas/stock-control-user.schema";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { PostgresSupplierProfileRepository } from "../supplier/supplier-profile.repository.postgres";
import { TeacherAssistantUser } from "../teacher-assistant/entities/teacher-assistant-user.entity";
import { TeacherAssistantUserSchema } from "../teacher-assistant/schemas/teacher-assistant-user.schema";
import { TeacherAssistantUserRepository } from "../teacher-assistant/teacher-assistant-user.repository";
import { MongoTeacherAssistantUserRepository } from "../teacher-assistant/teacher-assistant-user.repository.mongo";
import { PostgresTeacherAssistantUserRepository } from "../teacher-assistant/teacher-assistant-user.repository.postgres";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { IdentityReconciliationService } from "./identity-reconciliation.service";
import { SsoAdminController } from "./sso-admin.controller";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "App", schema: AppSchema },
            { name: "AppRole", schema: AppRoleSchema },
            { name: "UserAppAccess", schema: UserAppAccessSchema },
            { name: "CustomerProfile", schema: CustomerProfileSchema },
            { name: "SupplierProfile", schema: SupplierProfileSchema },
            { name: "StockControlProfile", schema: StockControlProfileSchema },
            { name: "AnnixOrbitProfile", schema: AnnixOrbitProfileSchema },
            { name: "AnnixSentinelProfile", schema: AnnixSentinelProfileSchema },
            { name: "RepProfile", schema: RepProfileSchema },
            { name: "TeacherAssistantUser", schema: TeacherAssistantUserSchema },
            { name: "StockControlUser", schema: StockControlUserSchema },
            { name: "AnnixOrbitUser", schema: AnnixOrbitUserSchema },
          ]),
        ]
      : [
          TypeOrmModule.forFeature([
            User,
            App,
            AppRole,
            UserAppAccess,
            CustomerProfile,
            SupplierProfile,
            StockControlProfile,
            AnnixOrbitProfile,
            AnnixSentinelProfile,
            RepProfile,
            TeacherAssistantUser,
            StockControlUser,
            AnnixOrbitUser,
          ]),
        ]),
    AdminModule,
  ],
  controllers: [SsoAdminController],
  providers: [
    IdentityReconciliationService,
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(AppRepository, PostgresAppRepository, MongoAppRepository),
    repositoryProvider(
      UserAppAccessRepository,
      PostgresUserAppAccessRepository,
      MongoUserAppAccessRepository,
    ),
    repositoryProvider(
      CustomerProfileRepository,
      PostgresCustomerProfileRepository,
      MongoCustomerProfileRepository,
    ),
    repositoryProvider(
      SupplierProfileRepository,
      PostgresSupplierProfileRepository,
      MongoSupplierProfileRepository,
    ),
    repositoryProvider(
      StockControlProfileRepository,
      PostgresStockControlProfileRepository,
      MongoStockControlProfileRepository,
    ),
    repositoryProvider(
      AnnixOrbitProfileRepository,
      PostgresAnnixOrbitProfileRepository,
      MongoAnnixOrbitProfileRepository,
    ),
    repositoryProvider(
      AnnixSentinelProfileRepository,
      PostgresAnnixSentinelProfileRepository,
      MongoAnnixSentinelProfileRepository,
    ),
    repositoryProvider(
      RepProfileRepository,
      PostgresRepProfileRepository,
      MongoRepProfileRepository,
    ),
    repositoryProvider(
      TeacherAssistantUserRepository,
      PostgresTeacherAssistantUserRepository,
      MongoTeacherAssistantUserRepository,
    ),
    repositoryProvider(
      StockControlUserRepository,
      PostgresStockControlUserRepository,
      MongoStockControlUserRepository,
    ),
    repositoryProvider(
      AnnixOrbitUserRepository,
      PostgresAnnixOrbitUserRepository,
      MongoAnnixOrbitUserRepository,
    ),
  ],
  exports: [IdentityReconciliationService],
})
export class SsoModule {}
