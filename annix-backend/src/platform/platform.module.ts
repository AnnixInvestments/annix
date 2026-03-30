import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompanyService } from "./company.service";
import { ContactService } from "./contact.service";
import { Company } from "./entities/company.entity";
import { CompanyModuleSubscription } from "./entities/company-module-subscription.entity";
import { Contact } from "./entities/contact.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Company, CompanyModuleSubscription, Contact])],
  providers: [CompanyService, ContactService],
  exports: [CompanyService, ContactService, TypeOrmModule],
})
export class PlatformModule {}
