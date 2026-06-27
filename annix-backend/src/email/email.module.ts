import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CompanyBrandingModule } from "../company-branding/company-branding.module";
import { EmailService } from "./email.service";

@Global()
@Module({
  imports: [ConfigModule, CompanyBrandingModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
