import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { StockControlUser } from "../stock-control/entities/stock-control-user.entity";
import { User } from "../user/entities/user.entity";
import {
  App,
  AppPermission,
  AppRole,
  AppRolePermission,
  AppRoleProduct,
  UserAppAccess,
  UserAppPermission,
} from "./entities";
import { AppPermissionGuard } from "./guards/app-permission.guard";
import { RbacController } from "./rbac.controller";
import { RbacService } from "./rbac.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      App,
      AppPermission,
      AppRole,
      AppRolePermission,
      AppRoleProduct,
      UserAppAccess,
      UserAppPermission,
      User,
      StockControlUser,
    ]),
    forwardRef(() => AdminModule),
  ],
  controllers: [RbacController],
  providers: [RbacService, AppPermissionGuard],
  exports: [RbacService, AppPermissionGuard],
})
export class RbacModule {}
