import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelCompanyDetailsRepository } from "./annix-sentinel-company-details.repository";
import { MongoAnnixSentinelCompanyDetailsRepository } from "./annix-sentinel-company-details.repository.mongo";
import { PostgresAnnixSentinelCompanyDetailsRepository } from "./annix-sentinel-company-details.repository.postgres";
import { AnnixSentinelProfileRepository } from "./annix-sentinel-profile.repository";
import { MongoAnnixSentinelProfileRepository } from "./annix-sentinel-profile.repository.mongo";
import { PostgresAnnixSentinelProfileRepository } from "./annix-sentinel-profile.repository.postgres";
import { AnnixSentinelCompaniesController } from "./companies.controller";
import { AnnixSentinelCompaniesService } from "./companies.service";
import { AnnixSentinelCompanyDetails } from "./entities/annix-sentinel-company-details.entity";
import { AnnixSentinelProfile } from "./entities/annix-sentinel-profile.entity";
import { AnnixSentinelCompanyDetailsSchema } from "./schemas/annix-sentinel-company-details.schema";
import { AnnixSentinelProfileSchema } from "./schemas/annix-sentinel-profile.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "AnnixSentinelProfile", schema: AnnixSentinelProfileSchema },
            {
              name: "AnnixSentinelCompanyDetails",
              schema: AnnixSentinelCompanyDetailsSchema,
            },
          ]),
          TypeOrmModule.forFeature([Company]),
        ]
      : [TypeOrmModule.forFeature([Company, AnnixSentinelProfile, AnnixSentinelCompanyDetails])]),
  ],
  controllers: [AnnixSentinelCompaniesController],
  providers: [
    AnnixSentinelCompaniesService,
    repositoryProvider(
      AnnixSentinelProfileRepository,
      PostgresAnnixSentinelProfileRepository,
      MongoAnnixSentinelProfileRepository,
    ),
    repositoryProvider(
      AnnixSentinelCompanyDetailsRepository,
      PostgresAnnixSentinelCompanyDetailsRepository,
      MongoAnnixSentinelCompanyDetailsRepository,
    ),
  ],
  exports: [
    TypeOrmModule,
    AnnixSentinelCompaniesService,
    AnnixSentinelProfileRepository,
    AnnixSentinelCompanyDetailsRepository,
  ],
})
export class AnnixSentinelCompaniesModule {}
