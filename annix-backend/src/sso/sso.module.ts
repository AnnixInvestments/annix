import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { AnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository";
import { MongoAnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository.mongo";
import { AnnixOrbitProfileSchema } from "../annix-orbit/schemas/annix-orbit-profile.schema";
import { RepProfileRepository } from "../annix-rep/rep-profile/rep-profile.repository";
import { MongoRepProfileRepository } from "../annix-rep/rep-profile/rep-profile.repository.mongo";
import { RepProfileSchema } from "../annix-rep/rep-profile/schemas/rep-profile.schema";
import { AnnixSentinelProfileRepository } from "../annix-sentinel/companies/annix-sentinel-profile.repository";
import { MongoAnnixSentinelProfileRepository } from "../annix-sentinel/companies/annix-sentinel-profile.repository.mongo";
import { AnnixSentinelProfileSchema } from "../annix-sentinel/companies/schemas/annix-sentinel-profile.schema";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { ORBIT_CONNECTION } from "../lib/persistence/mongo-connections";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { CompanySchema } from "../platform/schemas/company.schema";
import { AppRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import { MongoAppRepository, MongoUserAppAccessRepository } from "../rbac/rbac.repository.mongo";
import { AppSchema } from "../rbac/schemas/app.schema";
import { AppRoleSchema } from "../rbac/schemas/app-role.schema";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { StockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.mongo";
import { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.mongo";
import { StockControlProfileSchema } from "../stock-control/schemas/stock-control-profile.schema";
import { StockControlUserSchema } from "../stock-control/schemas/stock-control-user.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { TeacherAssistantUserSchema } from "../teacher-assistant/schemas/teacher-assistant-user.schema";
import { TeacherAssistantUserRepository } from "../teacher-assistant/teacher-assistant-user.repository";
import { MongoTeacherAssistantUserRepository } from "../teacher-assistant/teacher-assistant-user.repository.mongo";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { IdentityReconciliationService } from "./identity-reconciliation.service";
import { SsoAdminController } from "./sso-admin.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "App", schema: AppSchema },
      { name: "AppRole", schema: AppRoleSchema },
      { name: "UserAppAccess", schema: UserAppAccessSchema },
      { name: "Company", schema: CompanySchema },
      { name: "CustomerProfile", schema: CustomerProfileSchema },
      { name: "SupplierProfile", schema: SupplierProfileSchema },
      { name: "StockControlProfile", schema: StockControlProfileSchema },
      { name: "AnnixSentinelProfile", schema: AnnixSentinelProfileSchema },
      { name: "RepProfile", schema: RepProfileSchema },
      { name: "TeacherAssistantUser", schema: TeacherAssistantUserSchema },
      { name: "StockControlUser", schema: StockControlUserSchema },
    ]),
    MongooseModule.forFeature(
      [{ name: "AnnixOrbitProfile", schema: AnnixOrbitProfileSchema }],
      ORBIT_CONNECTION,
    ),
    AdminModule,
  ],
  controllers: [SsoAdminController],
  providers: [
    IdentityReconciliationService,
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(AppRepository, MongoAppRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
    repositoryProvider(CustomerProfileRepository, MongoCustomerProfileRepository),
    repositoryProvider(SupplierProfileRepository, MongoSupplierProfileRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(AnnixOrbitProfileRepository, MongoAnnixOrbitProfileRepository),
    repositoryProvider(AnnixSentinelProfileRepository, MongoAnnixSentinelProfileRepository),
    repositoryProvider(RepProfileRepository, MongoRepProfileRepository),
    repositoryProvider(TeacherAssistantUserRepository, MongoTeacherAssistantUserRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
  ],
  exports: [IdentityReconciliationService],
})
export class SsoModule {}
