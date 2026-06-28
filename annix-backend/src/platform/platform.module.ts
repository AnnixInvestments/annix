import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { AuthModule } from "../auth/auth.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { RubberCompanyRepository } from "../rubber-lining/repositories/rubber-company.repository";
import { MongoRubberCompanyRepository } from "../rubber-lining/repositories/rubber-company.repository.mongo";
import { RubberCompanySchema } from "../rubber-lining/schemas/rubber-company.schema";
import { StockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository.mongo";
import { StockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository.mongo";
import { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository.mongo";
import { StockControlCompanySchema } from "../stock-control/schemas/stock-control-company.schema";
import { StockControlProfileSchema } from "../stock-control/schemas/stock-control-profile.schema";
import { StockControlUserSchema } from "../stock-control/schemas/stock-control-user.schema";
import { CertificateController } from "./certificate.controller";
import { CertificateRepository } from "./certificate.repository";
import { MongoCertificateRepository } from "./certificate.repository.mongo";
import { CertificateService } from "./certificate.service";
import { CompanyController } from "./company.controller";
import { CompanyRepository } from "./company.repository";
import { MongoCompanyRepository } from "./company.repository.mongo";
import { CompanyService } from "./company.service";
import { CompanyModuleSubscriptionRepository } from "./company-module-subscription.repository";
import { MongoCompanyModuleSubscriptionRepository } from "./company-module-subscription.repository.mongo";
import { ContactController } from "./contact.controller";
import { ContactRepository } from "./contact.repository";
import { MongoContactRepository } from "./contact.repository.mongo";
import { ContactService } from "./contact.service";
import { DeliveryNoteController } from "./delivery-note.controller";
import { DeliveryNoteRepository } from "./delivery-note.repository";
import { MongoDeliveryNoteRepository } from "./delivery-note.repository.mongo";
import { DeliveryNoteService } from "./delivery-note.service";
import { InvoiceController } from "./invoice.controller";
import { InvoiceRepository } from "./invoice.repository";
import { MongoInvoiceRepository } from "./invoice.repository.mongo";
import { InvoiceService as PlatformInvoiceService } from "./invoice.service";
import { PlatformCompanyAuthGuard } from "./platform-company-auth.guard";
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
    AuthModule,
    AdminModule,
    MongooseModule.forFeature([
      { name: "Company", schema: CompanySchema },
      { name: "CompanyModuleSubscription", schema: CompanyModuleSubscriptionSchema },
      { name: "StockControlCompany", schema: StockControlCompanySchema },
      { name: "StockControlProfile", schema: StockControlProfileSchema },
      { name: "StockControlUser", schema: StockControlUserSchema },
      { name: "RubberCompany", schema: RubberCompanySchema },
      { name: "Contact", schema: ContactSchema },
      { name: "PlatformDeliveryNote", schema: PlatformDeliveryNoteSchema },
      { name: "PlatformInvoice", schema: PlatformInvoiceSchema },
      { name: "PlatformCertificate", schema: PlatformCertificateSchema },
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
    PlatformCompanyAuthGuard,
    ContactService,
    DeliveryNoteService,
    PlatformInvoiceService,
    ReportRegistryService,
    repositoryProvider(CompanyRepository, MongoCompanyRepository),
    repositoryProvider(
      CompanyModuleSubscriptionRepository,
      MongoCompanyModuleSubscriptionRepository,
    ),
    repositoryProvider(StockControlCompanyRepository, MongoStockControlCompanyRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
    repositoryProvider(RubberCompanyRepository, MongoRubberCompanyRepository),
    repositoryProvider(ContactRepository, MongoContactRepository),
    repositoryProvider(DeliveryNoteRepository, MongoDeliveryNoteRepository),
    repositoryProvider(InvoiceRepository, MongoInvoiceRepository),
    repositoryProvider(CertificateRepository, MongoCertificateRepository),
  ],
  exports: [
    CertificateService,
    CompanyService,
    CompanyRepository,
    ContactService,
    DeliveryNoteService,
    PlatformInvoiceService,
    ReportRegistryService,
  ],
})
export class PlatformModule {}
