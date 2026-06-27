import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { CompanyRepository } from "../platform/company.repository";
import { MongoCompanyRepository } from "../platform/company.repository.mongo";
import { CompanySchema } from "../platform/schemas/company.schema";
import { CompanyBrandingService } from "./company-branding.service";

// Standalone module so any feature (PDF generation, email) can read per-company
// branding without depending on the whole platform module.
@Module({
  imports: [MongooseModule.forFeature([{ name: "Company", schema: CompanySchema }])],
  providers: [
    CompanyBrandingService,
    repositoryProvider(CompanyRepository, MongoCompanyRepository),
  ],
  exports: [CompanyBrandingService],
})
export class CompanyBrandingModule {}
