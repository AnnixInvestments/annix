import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ANNIX_ORBIT_JWT_SECRET_DEFAULT } from "../annix-orbit/annix-orbit.constants";
import { AnnixOrbitEeConsentTextVersion } from "../annix-orbit/entities/annix-orbit-ee-consent-text-version.entity";
import { AnnixOrbitAuthGuard } from "../annix-orbit/guards/annix-orbit-auth.guard";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { User } from "../user/entities/user.entity";
import { AnnixOrbitEducationCapabilities } from "./capabilities/annix-orbit-education.capabilities";
import { EducationController } from "./controllers/education.controller";
import { AcademicResult } from "./entities/academic-result.entity";
import { EducationAiAdviceLog } from "./entities/education-ai-advice-log.entity";
import { EducationConsent } from "./entities/education-consent.entity";
import { EducationProfile } from "./entities/education-profile.entity";
import { GuardianLink } from "./entities/guardian-link.entity";
import { EducationConsentService } from "./services/education-consent.service";
import { EducationMentorService } from "./services/education-mentor.service";
import { EducationProfileService } from "./services/education-profile.service";
import { GuardianLinkService } from "./services/guardian-link.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EducationProfile,
      AcademicResult,
      GuardianLink,
      EducationConsent,
      EducationAiAdviceLog,
      AnnixOrbitEeConsentTextVersion,
      User,
      UserAppAccess,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("ANNIX_ORBIT_JWT_SECRET") ??
          configService.get<string>("CV_ASSISTANT_JWT_SECRET", ANNIX_ORBIT_JWT_SECRET_DEFAULT),
        signOptions: { expiresIn: "1h" },
      }),
    }),
    NixModule,
    MetricsModule,
  ],
  controllers: [EducationController],
  providers: [
    AnnixOrbitAuthGuard,
    EducationConsentService,
    EducationProfileService,
    GuardianLinkService,
    EducationMentorService,
    AnnixOrbitEducationCapabilities,
  ],
  exports: [EducationConsentService, EducationProfileService, EducationMentorService],
})
export class AnnixOrbitEducationModule {}
