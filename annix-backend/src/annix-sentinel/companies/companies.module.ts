import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelCompanyDetailsRepository } from "./annix-sentinel-company-details.repository";
import { MongoAnnixSentinelCompanyDetailsRepository } from "./annix-sentinel-company-details.repository.mongo";
import { AnnixSentinelProfileRepository } from "./annix-sentinel-profile.repository";
import { MongoAnnixSentinelProfileRepository } from "./annix-sentinel-profile.repository.mongo";
import { AnnixSentinelCompaniesController } from "./companies.controller";
import { AnnixSentinelCompaniesService } from "./companies.service";
import { AnnixSentinelCompanyDetailsSchema } from "./schemas/annix-sentinel-company-details.schema";
import { AnnixSentinelProfileSchema } from "./schemas/annix-sentinel-profile.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "AnnixSentinelProfile", schema: AnnixSentinelProfileSchema },
      {
        name: "AnnixSentinelCompanyDetails",
        schema: AnnixSentinelCompanyDetailsSchema,
      },
    ]),
  ],
  controllers: [AnnixSentinelCompaniesController],
  providers: [
    AnnixSentinelCompaniesService,
    repositoryProvider(AnnixSentinelProfileRepository, MongoAnnixSentinelProfileRepository),
    repositoryProvider(
      AnnixSentinelCompanyDetailsRepository,
      MongoAnnixSentinelCompanyDetailsRepository,
    ),
  ],
  exports: [
    AnnixSentinelCompaniesService,
    AnnixSentinelProfileRepository,
    AnnixSentinelCompanyDetailsRepository,
  ],
})
export class AnnixSentinelCompaniesModule {}
