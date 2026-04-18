import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../../platform/entities/company.entity";
import { ComplySaCompaniesController } from "./companies.controller";
import { ComplySaCompaniesService } from "./companies.service";
import { ComplySaCompanyDetails } from "./entities/comply-sa-company-details.entity";
import { ComplySaProfile } from "./entities/comply-sa-profile.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Company, ComplySaProfile, ComplySaCompanyDetails])],
  controllers: [ComplySaCompaniesController],
  providers: [ComplySaCompaniesService],
  exports: [TypeOrmModule, ComplySaCompaniesService],
})
export class ComplySaCompaniesModule {}
