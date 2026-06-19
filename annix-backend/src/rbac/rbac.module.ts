import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.mongo";
import { StockControlUserSchema } from "../stock-control/schemas/stock-control-user.schema";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { UserSyncModule } from "../user-sync/user-sync.module";
import { AppPermissionGuard } from "./guards/app-permission.guard";
import { RbacController } from "./rbac.controller";
import {
  AppPermissionRepository,
  AppRepository,
  AppRolePermissionRepository,
  AppRoleProductRepository,
  AppRoleRepository,
  UserAccessProductRepository,
  UserAppAccessRepository,
  UserAppPermissionRepository,
} from "./rbac.repository";
import {
  MongoAppPermissionRepository,
  MongoAppRepository,
  MongoAppRolePermissionRepository,
  MongoAppRoleProductRepository,
  MongoAppRoleRepository,
  MongoUserAccessProductRepository,
  MongoUserAppAccessRepository,
  MongoUserAppPermissionRepository,
} from "./rbac.repository.mongo";
import { RbacService } from "./rbac.service";
import { AppSchema } from "./schemas/app.schema";
import { AppPermissionSchema } from "./schemas/app-permission.schema";
import { AppRoleSchema } from "./schemas/app-role.schema";
import { AppRolePermissionSchema } from "./schemas/app-role-permission.schema";
import { AppRoleProductSchema } from "./schemas/app-role-product.schema";
import { UserAccessProductSchema } from "./schemas/user-access-product.schema";
import { UserAppAccessSchema } from "./schemas/user-app-access.schema";
import { UserAppPermissionSchema } from "./schemas/user-app-permission.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "App", schema: AppSchema },
      { name: "AppPermission", schema: AppPermissionSchema },
      { name: "AppRole", schema: AppRoleSchema },
      { name: "AppRolePermission", schema: AppRolePermissionSchema },
      { name: "AppRoleProduct", schema: AppRoleProductSchema },
      { name: "UserAccessProduct", schema: UserAccessProductSchema },
      { name: "UserAppAccess", schema: UserAppAccessSchema },
      { name: "UserAppPermission", schema: UserAppPermissionSchema },
      { name: "User", schema: UserSchema },
      { name: "StockControlUser", schema: StockControlUserSchema },
    ]),
    forwardRef(() => AdminModule),
    UserSyncModule,
  ],
  controllers: [RbacController],
  providers: [
    RbacService,
    AppPermissionGuard,
    repositoryProvider(AppRepository, MongoAppRepository),
    repositoryProvider(AppPermissionRepository, MongoAppPermissionRepository),
    repositoryProvider(AppRoleRepository, MongoAppRoleRepository),
    repositoryProvider(AppRolePermissionRepository, MongoAppRolePermissionRepository),
    repositoryProvider(AppRoleProductRepository, MongoAppRoleProductRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
    repositoryProvider(UserAppPermissionRepository, MongoUserAppPermissionRepository),
    repositoryProvider(UserAccessProductRepository, MongoUserAccessProductRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
  ],
  exports: [RbacService, AppPermissionGuard],
})
export class RbacModule {}
