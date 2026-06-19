import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
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
import { AppSchema } from "../../rbac/schemas/app.schema";
import { AppRoleSchema } from "../../rbac/schemas/app-role.schema";
import { UserAppAccessSchema } from "../../rbac/schemas/user-app-access.schema";
import { UserSchema } from "../../user/schemas/user.schema";
import { UserRepository } from "../../user/user.repository";
import { MongoUserRepository } from "../../user/user.repository.mongo";
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
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "App", schema: AppSchema },
      { name: "AppRole", schema: AppRoleSchema },
      { name: "UserAppAccess", schema: UserAppAccessSchema },
    ]),
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
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(AppRepository, MongoAppRepository),
    repositoryProvider(AppRoleRepository, MongoAppRoleRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
  ],
  exports: [
    AnnixSentinelAuthService,
    JwtModule,
    AnnixSentinelCompanyScopeGuard,
    AnnixSentinelCompaniesModule,
  ],
})
export class AnnixSentinelAuthModule {}
