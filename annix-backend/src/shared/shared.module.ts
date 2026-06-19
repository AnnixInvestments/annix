import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomerDocumentRepository } from "../customer/customer-document.repository";
import { MongoCustomerDocumentRepository } from "../customer/customer-document.repository.mongo";
import { CustomerDocumentSchema } from "../customer/schemas/customer-document.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SupplierDocumentSchema } from "../supplier/schemas/supplier-document.schema";
import { SupplierDocumentRepository } from "../supplier/supplier-document.repository";
import { MongoSupplierDocumentRepository } from "../supplier/supplier-document.repository.mongo";
import { AuthSharedModule } from "./auth/auth-shared.module";
import { IdempotencyKeyRepository } from "./idempotency-key.repository";
import { MongoIdempotencyKeyRepository } from "./idempotency-key.repository.mongo";
import { IdempotencyInterceptor } from "./interceptors/idempotency.interceptor";
import { IdempotencyKeySchema } from "./schemas/idempotency-key.schema";
import { DocumentCompressionService } from "./services/document-compression.service";
import { DocumentExpiryService } from "./services/document-expiry.service";
import { IdempotencyService } from "./services/idempotency.service";
import { PuppeteerPoolService } from "./services/puppeteer-pool.service";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "IdempotencyKey", schema: IdempotencyKeySchema },
      { name: "CustomerDocument", schema: CustomerDocumentSchema },
      { name: "SupplierDocument", schema: SupplierDocumentSchema },
    ]),
    AuthSharedModule,
  ],
  providers: [
    DocumentCompressionService,
    DocumentExpiryService,
    PuppeteerPoolService,
    IdempotencyService,
    IdempotencyInterceptor,
    repositoryProvider(IdempotencyKeyRepository, MongoIdempotencyKeyRepository),
    repositoryProvider(CustomerDocumentRepository, MongoCustomerDocumentRepository),
    repositoryProvider(SupplierDocumentRepository, MongoSupplierDocumentRepository),
  ],
  exports: [
    DocumentCompressionService,
    DocumentExpiryService,
    AuthSharedModule,
    PuppeteerPoolService,
    IdempotencyService,
    IdempotencyInterceptor,
  ],
})
export class SharedModule {}
