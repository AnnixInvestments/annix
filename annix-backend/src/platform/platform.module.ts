import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompanyService } from "./company.service";
import { ContactService } from "./contact.service";
import { PlatformCertificate } from "./entities/certificate.entity";
import { Company } from "./entities/company.entity";
import { CompanyModuleSubscription } from "./entities/company-module-subscription.entity";
import { Contact } from "./entities/contact.entity";
import { PlatformDeliveryNote } from "./entities/delivery-note.entity";
import { DeliveryNoteItem } from "./entities/delivery-note-item.entity";
import { PlatformInvoice } from "./entities/invoice.entity";
import { ReportRegistryService } from "./report-registry.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CompanyModuleSubscription,
      Contact,
      PlatformDeliveryNote,
      DeliveryNoteItem,
      PlatformInvoice,
      PlatformCertificate,
    ]),
  ],
  providers: [CompanyService, ContactService, ReportRegistryService],
  exports: [CompanyService, ContactService, ReportRegistryService, TypeOrmModule],
})
export class PlatformModule {}
