import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { User } from "../user/entities/user.entity";
import {
  App,
  AppPermission,
  AppRole,
  AppRolePermission,
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
