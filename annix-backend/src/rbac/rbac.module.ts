import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StockControlUser } from "../stock-control/entities/stock-control-user.entity";
import { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.mongo";
import { PostgresStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.postgres";
import { StockControlUserSchema } from "../stock-control/schemas/stock-control-user.schema";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { UserSyncModule } from "../user-sync/user-sync.module";
import {
  App,
  AppPermission,
  AppRole,
  AppRolePermission,
  AppRoleProduct,
  UserAccessProduct,
  UserAppAccess,
  UserAppPermission,
} from "./entities";
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
import {
  PostgresAppPermissionRepository,
  PostgresAppRepository,
  PostgresAppRolePermissionRepository,
  PostgresAppRoleProductRepository,
  PostgresAppRoleRepository,
  PostgresUserAccessProductRepository,
  PostgresUserAppAccessRepository,
  PostgresUserAppPermissionRepository,
} from "./rbac.repository.postgres";
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
    ...(isMongoDriver()
      ? [
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
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            App,
            AppPermission,
            AppRole,
            AppRolePermission,
            AppRoleProduct,
            UserAccessProduct,
            UserAppAccess,
            UserAppPermission,
            User,
            StockControlUser,
          ]),
        ]),
    forwardRef(() => AdminModule),
    UserSyncModule,
  ],
  controllers: [RbacController],
  providers: [
    RbacService,
    AppPermissionGuard,
    repositoryProvider(AppRepository, PostgresAppRepository, MongoAppRepository),
    repositoryProvider(
      AppPermissionRepository,
      PostgresAppPermissionRepository,
      MongoAppPermissionRepository,
    ),
    repositoryProvider(AppRoleRepository, PostgresAppRoleRepository, MongoAppRoleRepository),
    repositoryProvider(
      AppRolePermissionRepository,
      PostgresAppRolePermissionRepository,
      MongoAppRolePermissionRepository,
    ),
    repositoryProvider(
      AppRoleProductRepository,
      PostgresAppRoleProductRepository,
      MongoAppRoleProductRepository,
    ),
    repositoryProvider(
      UserAppAccessRepository,
      PostgresUserAppAccessRepository,
      MongoUserAppAccessRepository,
    ),
    repositoryProvider(
      UserAppPermissionRepository,
      PostgresUserAppPermissionRepository,
      MongoUserAppPermissionRepository,
    ),
    repositoryProvider(
      UserAccessProductRepository,
      PostgresUserAccessProductRepository,
      MongoUserAccessProductRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(
      StockControlUserRepository,
      PostgresStockControlUserRepository,
      MongoStockControlUserRepository,
    ),
  ],
  exports: [RbacService, AppPermissionGuard],
})
export class RbacModule {}
