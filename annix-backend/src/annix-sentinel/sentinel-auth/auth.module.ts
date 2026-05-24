import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../../platform/entities/company.entity";
import { App } from "../../rbac/entities/app.entity";
import { AppRole } from "../../rbac/entities/app-role.entity";
import { UserAppAccess } from "../../rbac/entities/user-app-access.entity";
import { User } from "../../user/entities/user.entity";
import { AnnixSentinelCompaniesModule } from "../companies/companies.module";
import { AnnixSentinelCompanyDetails } from "../companies/entities/annix-sentinel-company-details.entity";
import { AnnixSentinelProfile } from "../companies/entities/annix-sentinel-profile.entity";
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
    TypeOrmModule.forFeature([
      User,
      Company,
      AnnixSentinelProfile,
      AnnixSentinelCompanyDetails,
      App,
      AppRole,
      UserAppAccess,
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
  ],
  exports: [AnnixSentinelAuthService, JwtModule, AnnixSentinelCompanyScopeGuard, TypeOrmModule],
})
export class AnnixSentinelAuthModule {}
