import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerDocument } from "../customer/entities/customer-document.entity";
import { SupplierDocument } from "../supplier/entities/supplier-document.entity";
import { AuthSharedModule } from "./auth/auth-shared.module";
import { IdempotencyKey } from "./entities/idempotency-key.entity";
import { IdempotencyInterceptor } from "./interceptors/idempotency.interceptor";
import { DocumentCompressionService } from "./services/document-compression.service";
import { DocumentExpiryService } from "./services/document-expiry.service";
import { IdempotencyService } from "./services/idempotency.service";
import { PuppeteerPoolService } from "./services/puppeteer-pool.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerDocument, SupplierDocument, IdempotencyKey]),
    AuthSharedModule,
  ],
  providers: [
    DocumentCompressionService,
    DocumentExpiryService,
    PuppeteerPoolService,
    IdempotencyService,
    IdempotencyInterceptor,
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
