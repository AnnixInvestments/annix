import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  App,
  AppPermission,
  AppRole,
  AppRolePermission,
  UserAppAccess,
  UserAppPermission,
} from "./entities";
import { User } from "../user/entities/user.entity";
import { RbacService } from "./rbac.service";
import { RbacController } from "./rbac.controller";
import { AppPermissionGuard } from "./guards/app-permission.guard";
import { AdminModule } from "../admin/admin.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      App,
      AppPermission,
      AppRole,
      AppRolePermission,
      UserAppAccess,
      UserAppPermission,
      User,
    ]),
    forwardRef(() => AdminModule),
  ],
  controllers: [RbacController],
  providers: [RbacService, AppPermissionGuard],
  exports: [RbacService, AppPermissionGuard],
})
export class RbacModule {}
