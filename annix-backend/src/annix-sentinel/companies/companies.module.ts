import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelCompaniesController } from "./companies.controller";
import { AnnixSentinelCompaniesService } from "./companies.service";
import { AnnixSentinelCompanyDetails } from "./entities/annix-sentinel-company-details.entity";
import { AnnixSentinelProfile } from "./entities/annix-sentinel-profile.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Company, AnnixSentinelProfile, AnnixSentinelCompanyDetails])],
  controllers: [AnnixSentinelCompaniesController],
  providers: [AnnixSentinelCompaniesService],
  exports: [TypeOrmModule, AnnixSentinelCompaniesService],
})
export class AnnixSentinelCompaniesModule {}
