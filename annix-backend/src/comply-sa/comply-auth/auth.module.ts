import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ComplySaCompaniesModule } from "../companies/companies.module";
import { ComplySaAuthController } from "./auth.controller";
import { ComplySaAuthService } from "./auth.service";
import { ComplySaJwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    ComplySaCompaniesModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: "7d" },
      }),
    }),
  ],
  controllers: [ComplySaAuthController],
  providers: [ComplySaAuthService, ComplySaJwtStrategy],
  exports: [ComplySaAuthService, JwtModule],
})
export class ComplySaAuthModule {}
