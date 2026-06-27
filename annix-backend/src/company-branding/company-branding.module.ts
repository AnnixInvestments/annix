import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CompanyProfileRepository } from "../admin/repositories/company-profile.repository";
import { MongoCompanyProfileRepository } from "../admin/repositories/company-profile.repository.mongo";
import { CompanyProfileSchema } from "../admin/schemas/company-profile.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { CompanyBrandingService } from "./company-branding.service";

// Standalone module so any feature (PDF generation, email) can read the
// company branding without depending on the whole AdminModule.
@Module({
  imports: [MongooseModule.forFeature([{ name: "CompanyProfile", schema: CompanyProfileSchema }])],
  providers: [
    CompanyBrandingService,
    repositoryProvider(CompanyProfileRepository, MongoCompanyProfileRepository),
  ],
  exports: [CompanyBrandingService],
})
export class CompanyBrandingModule {}
