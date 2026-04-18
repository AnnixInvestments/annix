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
import { ComplySaCompaniesModule } from "../companies/companies.module";
import { ComplySaCompanyDetails } from "../companies/entities/comply-sa-company-details.entity";
import { ComplySaProfile } from "../companies/entities/comply-sa-profile.entity";
import { ComplySaUser } from "../companies/entities/user.entity";
import { ComplySaAuthController } from "./auth.controller";
import { ComplySaAuthService } from "./auth.service";
import { ComplySaDataRetentionService } from "./data-retention.service";
import { ComplySaCompanyScopeGuard } from "./guards/company-scope.guard";
import { ComplySaJwtStrategy } from "./strategies/jwt.strategy";

@Global()
@Module({
  imports: [
    ComplySaCompaniesModule,
    PassportModule,
    TypeOrmModule.forFeature([
      ComplySaUser,
      User,
      Company,
      ComplySaProfile,
      ComplySaCompanyDetails,
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
  controllers: [ComplySaAuthController],
  providers: [
    ComplySaAuthService,
    ComplySaDataRetentionService,
    ComplySaJwtStrategy,
    ComplySaCompanyScopeGuard,
  ],
  exports: [ComplySaAuthService, JwtModule, ComplySaCompanyScopeGuard, TypeOrmModule],
})
export class ComplySaAuthModule {}
