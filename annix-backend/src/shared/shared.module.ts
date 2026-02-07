import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerDocument } from "../customer/entities/customer-document.entity";
import { SupplierDocument } from "../supplier/entities/supplier-document.entity";
import { AuthSharedModule } from "./auth/auth-shared.module";
import { DocumentCompressionService } from "./services/document-compression.service";
import { DocumentExpiryService } from "./services/document-expiry.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([CustomerDocument, SupplierDocument]), AuthSharedModule],
  providers: [DocumentCompressionService, DocumentExpiryService],
  exports: [DocumentCompressionService, DocumentExpiryService, AuthSharedModule],
})
export class SharedModule {}
