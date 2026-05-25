import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AnnixOrbitProfile } from "../annix-orbit/entities/annix-orbit-profile.entity";
import { AnnixOrbitUser } from "../annix-orbit/entities/annix-orbit-user.entity";
import { RepProfile } from "../annix-rep/rep-profile/rep-profile.entity";
import { AnnixSentinelProfile } from "../annix-sentinel/companies/entities/annix-sentinel-profile.entity";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { App } from "../rbac/entities/app.entity";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { StockControlProfile } from "../stock-control/entities/stock-control-profile.entity";
import { StockControlUser } from "../stock-control/entities/stock-control-user.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { TeacherAssistantUser } from "../teacher-assistant/entities/teacher-assistant-user.entity";
import { User } from "../user/entities/user.entity";
import { IdentityReconciliationService } from "./identity-reconciliation.service";
import { SsoAdminController } from "./sso-admin.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      App,
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
    AdminModule,
  ],
  controllers: [SsoAdminController],
  providers: [IdentityReconciliationService],
  exports: [IdentityReconciliationService],
})
export class SsoModule {}
