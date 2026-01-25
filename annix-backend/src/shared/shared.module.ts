import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCompressionService } from './services/document-compression.service';
import { DocumentExpiryService } from './services/document-expiry.service';
import { CustomerDocument } from '../customer/entities/customer-document.entity';
import { SupplierDocument } from '../supplier/entities/supplier-document.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([CustomerDocument, SupplierDocument])],
  providers: [DocumentCompressionService, DocumentExpiryService],
  exports: [DocumentCompressionService, DocumentExpiryService],
})
export class SharedModule {}
