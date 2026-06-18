import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { App } from "../../rbac/entities/app.entity";
import { AppRole } from "../../rbac/entities/app-role.entity";
import { UserAppAccess } from "../../rbac/entities/user-app-access.entity";
import {
  AppRepository,
  AppRoleRepository,
  UserAppAccessRepository,
} from "../../rbac/rbac.repository";
import {
  MongoAppRepository,
  MongoAppRoleRepository,
  MongoUserAppAccessRepository,
} from "../../rbac/rbac.repository.mongo";
import {
  PostgresAppRepository,
  PostgresAppRoleRepository,
  PostgresUserAppAccessRepository,
} from "../../rbac/rbac.repository.postgres";
import { AppSchema } from "../../rbac/schemas/app.schema";
import { AppRoleSchema } from "../../rbac/schemas/app-role.schema";
import { UserAppAccessSchema } from "../../rbac/schemas/user-app-access.schema";
import { User } from "../../user/entities/user.entity";
import { UserSchema } from "../../user/schemas/user.schema";
import { UserRepository } from "../../user/user.repository";
import { MongoUserRepository } from "../../user/user.repository.mongo";
import { PostgresUserRepository } from "../../user/user.repository.postgres";
import { AnnixSentinelCompaniesModule } from "../companies/companies.module";
import { AnnixSentinelAuthController } from "./auth.controller";
import { AnnixSentinelAuthService } from "./auth.service";
import { AnnixSentinelDataRetentionService } from "./data-retention.service";
import { AnnixSentinelCompanyScopeGuard } from "./guards/company-scope.guard";
import { AnnixSentinelJwtStrategy } from "./strategies/jwt.strategy";

@Global()
@Module({
  imports: [
    AnnixSentinelCompaniesModule,
    PassportModule,
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "App", schema: AppSchema },
            { name: "AppRole", schema: AppRoleSchema },
            { name: "UserAppAccess", schema: UserAppAccessSchema },
          ]),
        ]
      : [TypeOrmModule.forFeature([User, App, AppRole, UserAppAccess])]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: "7d" },
      }),
    }),
  ],
  controllers: [AnnixSentinelAuthController],
  providers: [
    AnnixSentinelAuthService,
    AnnixSentinelDataRetentionService,
    AnnixSentinelJwtStrategy,
    AnnixSentinelCompanyScopeGuard,
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(AppRepository, PostgresAppRepository, MongoAppRepository),
    repositoryProvider(AppRoleRepository, PostgresAppRoleRepository, MongoAppRoleRepository),
    repositoryProvider(
      UserAppAccessRepository,
      PostgresUserAppAccessRepository,
      MongoUserAppAccessRepository,
    ),
  ],
  exports: [
    AnnixSentinelAuthService,
    JwtModule,
    AnnixSentinelCompanyScopeGuard,
    AnnixSentinelCompaniesModule,
  ],
})
export class AnnixSentinelAuthModule {}
