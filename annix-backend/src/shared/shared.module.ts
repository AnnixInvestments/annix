import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerDocumentRepository } from "../customer/customer-document.repository";
import { MongoCustomerDocumentRepository } from "../customer/customer-document.repository.mongo";
import { PostgresCustomerDocumentRepository } from "../customer/customer-document.repository.postgres";
import { CustomerDocument } from "../customer/entities/customer-document.entity";
import { CustomerDocumentSchema } from "../customer/schemas/customer-document.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SupplierDocument } from "../supplier/entities/supplier-document.entity";
import { SupplierDocumentSchema } from "../supplier/schemas/supplier-document.schema";
import { SupplierDocumentRepository } from "../supplier/supplier-document.repository";
import { MongoSupplierDocumentRepository } from "../supplier/supplier-document.repository.mongo";
import { PostgresSupplierDocumentRepository } from "../supplier/supplier-document.repository.postgres";
import { AuthSharedModule } from "./auth/auth-shared.module";
import { IdempotencyKey } from "./entities/idempotency-key.entity";
import { IdempotencyKeyRepository } from "./idempotency-key.repository";
import { MongoIdempotencyKeyRepository } from "./idempotency-key.repository.mongo";
import { PostgresIdempotencyKeyRepository } from "./idempotency-key.repository.postgres";
import { IdempotencyInterceptor } from "./interceptors/idempotency.interceptor";
import { IdempotencyKeySchema } from "./schemas/idempotency-key.schema";
import { DocumentCompressionService } from "./services/document-compression.service";
import { DocumentExpiryService } from "./services/document-expiry.service";
import { IdempotencyService } from "./services/idempotency.service";
import { PuppeteerPoolService } from "./services/puppeteer-pool.service";

@Global()
@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "IdempotencyKey", schema: IdempotencyKeySchema },
            { name: "CustomerDocument", schema: CustomerDocumentSchema },
            { name: "SupplierDocument", schema: SupplierDocumentSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([CustomerDocument, SupplierDocument, IdempotencyKey])]),
    AuthSharedModule,
  ],
  providers: [
    DocumentCompressionService,
    DocumentExpiryService,
    PuppeteerPoolService,
    IdempotencyService,
    IdempotencyInterceptor,
    repositoryProvider(
      IdempotencyKeyRepository,
      PostgresIdempotencyKeyRepository,
      MongoIdempotencyKeyRepository,
    ),
    repositoryProvider(
      CustomerDocumentRepository,
      PostgresCustomerDocumentRepository,
      MongoCustomerDocumentRepository,
    ),
    repositoryProvider(
      SupplierDocumentRepository,
      PostgresSupplierDocumentRepository,
      MongoSupplierDocumentRepository,
    ),
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
