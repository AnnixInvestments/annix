import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CertificateController } from "./certificate.controller";
import { CertificateService } from "./certificate.service";
import { CompanyController } from "./company.controller";
import { CompanyService } from "./company.service";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";
import { DeliveryNoteController } from "./delivery-note.controller";
import { DeliveryNoteService } from "./delivery-note.service";
import { PlatformCertificate } from "./entities/certificate.entity";
import { Company } from "./entities/company.entity";
import { CompanyModuleSubscription } from "./entities/company-module-subscription.entity";
import { Contact } from "./entities/contact.entity";
import { PlatformDeliveryNote } from "./entities/delivery-note.entity";
import { DeliveryNoteItem } from "./entities/delivery-note-item.entity";
import { PlatformInvoice } from "./entities/invoice.entity";
import { InvoiceController } from "./invoice.controller";
import { InvoiceService as PlatformInvoiceService } from "./invoice.service";
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
  controllers: [
    CertificateController,
    CompanyController,
    ContactController,
    DeliveryNoteController,
    InvoiceController,
  ],
  providers: [
    CertificateService,
    CompanyService,
    ContactService,
    DeliveryNoteService,
    PlatformInvoiceService,
    ReportRegistryService,
  ],
  exports: [
    CertificateService,
    CompanyService,
    ContactService,
    DeliveryNoteService,
    PlatformInvoiceService,
    ReportRegistryService,
    TypeOrmModule,
  ],
})
export class PlatformModule {}
