import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaCompaniesModule } from "../companies/companies.module";
import { ComplySaUser } from "../companies/entities/user.entity";
import { ComplySaAuthController } from "./auth.controller";
import { ComplySaAuthService } from "./auth.service";
import { ComplySaCompanyScopeGuard } from "./guards/company-scope.guard";
import { ComplySaJwtStrategy } from "./strategies/jwt.strategy";

@Global()
@Module({
  imports: [
    ComplySaCompaniesModule,
    PassportModule,
    TypeOrmModule.forFeature([ComplySaUser]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: "7d" },
      }),
    }),
  ],
  controllers: [ComplySaAuthController],
  providers: [ComplySaAuthService, ComplySaJwtStrategy, ComplySaCompanyScopeGuard],
  exports: [ComplySaAuthService, JwtModule, ComplySaCompanyScopeGuard, TypeOrmModule],
})
export class ComplySaAuthModule {}
