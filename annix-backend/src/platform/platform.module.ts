import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { CertificateController } from "./certificate.controller";
import { CertificateRepository } from "./certificate.repository";
import { MongoCertificateRepository } from "./certificate.repository.mongo";
import { PostgresCertificateRepository } from "./certificate.repository.postgres";
import { CertificateService } from "./certificate.service";
import { CompanyController } from "./company.controller";
import { CompanyRepository } from "./company.repository";
import { MongoCompanyRepository } from "./company.repository.mongo";
import { PostgresCompanyRepository } from "./company.repository.postgres";
import { CompanyService } from "./company.service";
import { CompanyModuleSubscriptionRepository } from "./company-module-subscription.repository";
import { MongoCompanyModuleSubscriptionRepository } from "./company-module-subscription.repository.mongo";
import { PostgresCompanyModuleSubscriptionRepository } from "./company-module-subscription.repository.postgres";
import { ContactController } from "./contact.controller";
import { ContactRepository } from "./contact.repository";
import { MongoContactRepository } from "./contact.repository.mongo";
import { PostgresContactRepository } from "./contact.repository.postgres";
import { ContactService } from "./contact.service";
import { DeliveryNoteController } from "./delivery-note.controller";
import { DeliveryNoteRepository } from "./delivery-note.repository";
import { MongoDeliveryNoteRepository } from "./delivery-note.repository.mongo";
import { PostgresDeliveryNoteRepository } from "./delivery-note.repository.postgres";
import { DeliveryNoteService } from "./delivery-note.service";
import { PlatformCertificate } from "./entities/certificate.entity";
import { Company } from "./entities/company.entity";
import { CompanyModuleSubscription } from "./entities/company-module-subscription.entity";
import { Contact } from "./entities/contact.entity";
import { PlatformDeliveryNote } from "./entities/delivery-note.entity";
import { DeliveryNoteItem } from "./entities/delivery-note-item.entity";
import { PlatformInvoice } from "./entities/invoice.entity";
import { InvoiceController } from "./invoice.controller";
import { InvoiceRepository } from "./invoice.repository";
import { MongoInvoiceRepository } from "./invoice.repository.mongo";
import { PostgresInvoiceRepository } from "./invoice.repository.postgres";
import { InvoiceService as PlatformInvoiceService } from "./invoice.service";
import { ReportRegistryService } from "./report-registry.service";
import { CompanySchema } from "./schemas/company.schema";
import { CompanyModuleSubscriptionSchema } from "./schemas/company-module-subscription.schema";
import { ContactSchema } from "./schemas/contact.schema";
import { PlatformCertificateSchema } from "./schemas/platform-certificate.schema";
import { PlatformDeliveryNoteSchema } from "./schemas/platform-delivery-note.schema";
import { PlatformInvoiceSchema } from "./schemas/platform-invoice.schema";

@Global()
@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "Company", schema: CompanySchema },
            { name: "CompanyModuleSubscription", schema: CompanyModuleSubscriptionSchema },
            { name: "Contact", schema: ContactSchema },
            { name: "PlatformDeliveryNote", schema: PlatformDeliveryNoteSchema },
            { name: "PlatformInvoice", schema: PlatformInvoiceSchema },
            { name: "PlatformCertificate", schema: PlatformCertificateSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            Company,
            CompanyModuleSubscription,
            Contact,
            PlatformDeliveryNote,
            DeliveryNoteItem,
            PlatformInvoice,
            PlatformCertificate,
          ]),
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
    repositoryProvider(CompanyRepository, PostgresCompanyRepository, MongoCompanyRepository),
    repositoryProvider(
      CompanyModuleSubscriptionRepository,
      PostgresCompanyModuleSubscriptionRepository,
      MongoCompanyModuleSubscriptionRepository,
    ),
    repositoryProvider(ContactRepository, PostgresContactRepository, MongoContactRepository),
    repositoryProvider(
      DeliveryNoteRepository,
      PostgresDeliveryNoteRepository,
      MongoDeliveryNoteRepository,
    ),
    repositoryProvider(InvoiceRepository, PostgresInvoiceRepository, MongoInvoiceRepository),
    repositoryProvider(
      CertificateRepository,
      PostgresCertificateRepository,
      MongoCertificateRepository,
    ),
  ],
  exports: [
    CertificateService,
    CompanyService,
    CompanyRepository,
    ContactService,
    DeliveryNoteService,
    PlatformInvoiceService,
    ReportRegistryService,
    ...(isMongoDriver() ? [] : [TypeOrmModule]),
  ],
})
export class PlatformModule {}
