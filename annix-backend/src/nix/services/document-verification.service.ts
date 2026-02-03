import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { now } from '../../lib/datetime';

import { CustomerDocument } from '../../customer/entities/customer-document.entity';
import { CustomerDocumentType, CustomerDocumentValidationStatus } from '../../customer/entities/customer-document.entity';
import { CustomerCompany } from '../../customer/entities/customer-company.entity';
import { CustomerProfile } from '../../customer/entities/customer-profile.entity';
import { SupplierDocument } from '../../supplier/entities/supplier-document.entity';
import { SupplierDocumentType, SupplierDocumentValidationStatus } from '../../supplier/entities/supplier-document.entity';
import { SupplierCompany } from '../../supplier/entities/supplier-company.entity';
import { SupplierProfile } from '../../supplier/entities/supplier-profile.entity';
import { S3StorageService } from '../../storage/s3-storage.service';
import {
  RegistrationDocumentVerifierService,
  RegistrationDocumentType,
  ExpectedCompanyData,
  RegistrationVerificationResult,
} from './registration-document-verifier.service';

export interface DocumentVerificationRequest {
  entityType: 'customer' | 'supplier';
  entityId: number;
  documentId: number;
}

export interface DocumentVerificationResponse {
  success: boolean;
  documentId: number;
  entityType: 'customer' | 'supplier';
  verificationResult: RegistrationVerificationResult | null;
  validationStatus: string;
  allFieldsMatch: boolean;
  requiresManualReview: boolean;
  errorMessage?: string;
}

@Injectable()
export class DocumentVerificationService {
  private readonly logger = new Logger(DocumentVerificationService.name);

  constructor(
    @InjectRepository(CustomerDocument)
    private readonly customerDocumentRepo: Repository<CustomerDocument>,
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepo: Repository<CustomerProfile>,
    @InjectRepository(SupplierDocument)
    private readonly supplierDocumentRepo: Repository<SupplierDocument>,
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepo: Repository<SupplierProfile>,
    private readonly storageService: S3StorageService,
    private readonly verifierService: RegistrationDocumentVerifierService,
  ) {}

  async verifyDocument(request: DocumentVerificationRequest): Promise<DocumentVerificationResponse> {
    const { entityType, entityId, documentId } = request;

    try {
      if (entityType === 'customer') {
        return await this.verifyCustomerDocument(entityId, documentId);
      } else {
        return await this.verifySupplierDocument(entityId, documentId);
      }
    } catch (error) {
      this.logger.error(`Document verification failed: ${error.message}`, error.stack);
      return {
        success: false,
        documentId,
        entityType,
        verificationResult: null,
        validationStatus: 'failed',
        allFieldsMatch: false,
        requiresManualReview: true,
        errorMessage: error.message,
      };
    }
  }

  private async verifyCustomerDocument(customerId: number, documentId: number): Promise<DocumentVerificationResponse> {
    const document = await this.customerDocumentRepo.findOne({
      where: { id: documentId, customerId },
    });

    if (!document) {
      throw new Error('Customer document not found');
    }

    const profile = await this.customerProfileRepo.findOne({
      where: { id: customerId },
      relations: ['company'],
    });

    if (!profile?.company) {
      throw new Error('Customer company not found');
    }

    const docType = this.mapCustomerDocumentType(document.documentType);
    if (!docType) {
      this.logger.log(`Document type ${document.documentType} does not require verification`);
      return {
        success: true,
        documentId,
        entityType: 'customer',
        verificationResult: null,
        validationStatus: CustomerDocumentValidationStatus.PENDING,
        allFieldsMatch: true,
        requiresManualReview: false,
      };
    }

    const expectedData = this.buildExpectedDataFromCustomerCompany(profile.company);
    const fileBuffer = await this.storageService.download(document.filePath);
    const multerFile = this.bufferToMulterFile(fileBuffer, document.fileName, document.mimeType);

    const verificationResult = await this.verifierService.verifyDocument(multerFile, docType, expectedData);

    await this.updateCustomerDocumentWithVerification(document, verificationResult);

    const requiresManualReview = !verificationResult.allFieldsMatch || verificationResult.overallConfidence < 0.7;

    return {
      success: verificationResult.success,
      documentId,
      entityType: 'customer',
      verificationResult,
      validationStatus: document.validationStatus,
      allFieldsMatch: verificationResult.allFieldsMatch,
      requiresManualReview,
    };
  }

  private async verifySupplierDocument(supplierId: number, documentId: number): Promise<DocumentVerificationResponse> {
    const document = await this.supplierDocumentRepo.findOne({
      where: { id: documentId, supplierId },
    });

    if (!document) {
      throw new Error('Supplier document not found');
    }

    const profile = await this.supplierProfileRepo.findOne({
      where: { id: supplierId },
      relations: ['company'],
    });

    if (!profile?.company) {
      throw new Error('Supplier company not found');
    }

    const docType = this.mapSupplierDocumentType(document.documentType);
    if (!docType) {
      this.logger.log(`Document type ${document.documentType} does not require verification`);
      return {
        success: true,
        documentId,
        entityType: 'supplier',
        verificationResult: null,
        validationStatus: SupplierDocumentValidationStatus.PENDING,
        allFieldsMatch: true,
        requiresManualReview: false,
      };
    }

    const expectedData = this.buildExpectedDataFromSupplierCompany(profile.company);
    const fileBuffer = await this.storageService.download(document.filePath);
    const multerFile = this.bufferToMulterFile(fileBuffer, document.fileName, document.mimeType);

    const verificationResult = await this.verifierService.verifyDocument(multerFile, docType, expectedData);

    await this.updateSupplierDocumentWithVerification(document, verificationResult);

    const requiresManualReview = !verificationResult.allFieldsMatch || verificationResult.overallConfidence < 0.7;

    return {
      success: verificationResult.success,
      documentId,
      entityType: 'supplier',
      verificationResult,
      validationStatus: document.validationStatus,
      allFieldsMatch: verificationResult.allFieldsMatch,
      requiresManualReview,
    };
  }

  private mapCustomerDocumentType(docType: CustomerDocumentType): RegistrationDocumentType | null {
    const mapping: Partial<Record<CustomerDocumentType, RegistrationDocumentType>> = {
      [CustomerDocumentType.VAT_CERT]: 'vat',
      [CustomerDocumentType.REGISTRATION_CERT]: 'registration',
      [CustomerDocumentType.BEE_CERT]: 'bee',
    };
    return mapping[docType] ?? null;
  }

  private mapSupplierDocumentType(docType: SupplierDocumentType): RegistrationDocumentType | null {
    const mapping: Partial<Record<SupplierDocumentType, RegistrationDocumentType>> = {
      [SupplierDocumentType.VAT_CERT]: 'vat',
      [SupplierDocumentType.REGISTRATION_CERT]: 'registration',
      [SupplierDocumentType.BEE_CERT]: 'bee',
    };
    return mapping[docType] ?? null;
  }

  private buildExpectedDataFromCustomerCompany(company: CustomerCompany): ExpectedCompanyData {
    return {
      vatNumber: company.vatNumber ?? undefined,
      registrationNumber: company.registrationNumber,
      companyName: company.legalName,
      streetAddress: company.streetAddress,
      city: company.city,
      provinceState: company.provinceState,
      postalCode: company.postalCode,
      beeLevel: company.beeLevel ?? undefined,
    };
  }

  private buildExpectedDataFromSupplierCompany(company: SupplierCompany): ExpectedCompanyData {
    return {
      vatNumber: company.vatNumber ?? undefined,
      registrationNumber: company.registrationNumber,
      companyName: company.legalName,
      streetAddress: company.streetAddress,
      city: company.city,
      provinceState: company.provinceState,
      postalCode: company.postalCode,
      beeLevel: company.beeLevel ?? undefined,
    };
  }

  private async updateCustomerDocumentWithVerification(
    document: CustomerDocument,
    result: RegistrationVerificationResult,
  ): Promise<void> {
    document.ocrExtractedData = {
      vatNumber: result.extractedData.vatNumber,
      registrationNumber: result.extractedData.registrationNumber,
      companyName: result.extractedData.companyName,
      streetAddress: result.extractedData.streetAddress,
      city: result.extractedData.city,
      provinceState: result.extractedData.provinceState,
      postalCode: result.extractedData.postalCode,
      rawText: result.extractedData.rawText,
      confidence: String(result.overallConfidence),
    };
    document.ocrProcessedAt = now().toJSDate();
    document.ocrFailed = !result.success;
    document.verificationConfidence = result.overallConfidence;
    document.allFieldsMatch = result.allFieldsMatch;
    document.fieldResults = result.fieldResults.map((fr) => ({
      fieldName: fr.field,
      expected: String(fr.expected ?? ''),
      extracted: String(fr.extracted ?? ''),
      matches: fr.match,
      similarity: fr.similarity ?? (fr.match ? 100 : 0),
    }));

    if (!result.success) {
      document.validationStatus = CustomerDocumentValidationStatus.FAILED;
      document.validationNotes = 'OCR processing failed';
    } else if (result.allFieldsMatch && result.overallConfidence >= 0.7) {
      document.validationStatus = CustomerDocumentValidationStatus.VALID;
      document.validationNotes = 'Automatic validation passed';
    } else {
      document.validationStatus = CustomerDocumentValidationStatus.MANUAL_REVIEW;
      document.validationNotes = this.verifierService.generateMismatchReport(result);
    }

    await this.customerDocumentRepo.save(document);
  }

  private async updateSupplierDocumentWithVerification(
    document: SupplierDocument,
    result: RegistrationVerificationResult,
  ): Promise<void> {
    document.ocrExtractedData = {
      vatNumber: result.extractedData.vatNumber,
      registrationNumber: result.extractedData.registrationNumber,
      companyName: result.extractedData.companyName,
      streetAddress: result.extractedData.streetAddress,
      city: result.extractedData.city,
      provinceState: result.extractedData.provinceState,
      postalCode: result.extractedData.postalCode,
      beeLevel: result.extractedData.beeLevel,
      beeExpiryDate: result.extractedData.beeExpiryDate,
      rawText: result.extractedData.rawText,
      confidence: String(result.overallConfidence),
    };
    document.ocrProcessedAt = now().toJSDate();
    document.ocrFailed = !result.success;
    document.verificationConfidence = result.overallConfidence;
    document.allFieldsMatch = result.allFieldsMatch;
    document.fieldResults = result.fieldResults.map((fr) => ({
      fieldName: fr.field,
      expected: String(fr.expected ?? ''),
      extracted: String(fr.extracted ?? ''),
      matches: fr.match,
      similarity: fr.similarity ?? (fr.match ? 100 : 0),
    }));

    if (!result.success) {
      document.validationStatus = SupplierDocumentValidationStatus.FAILED;
      document.validationNotes = 'OCR processing failed';
    } else if (result.allFieldsMatch && result.overallConfidence >= 0.7) {
      document.validationStatus = SupplierDocumentValidationStatus.VALID;
      document.validationNotes = 'Automatic validation passed';
    } else {
      document.validationStatus = SupplierDocumentValidationStatus.MANUAL_REVIEW;
      document.validationNotes = this.verifierService.generateMismatchReport(result);
    }

    await this.supplierDocumentRepo.save(document);
  }

  private bufferToMulterFile(buffer: Buffer, filename: string, mimeType: string): Express.Multer.File {
    return {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: mimeType,
      size: buffer.length,
      buffer,
      stream: null as any,
      destination: '',
      filename: filename,
      path: '',
    };
  }

  async verifyAllPendingDocuments(entityType: 'customer' | 'supplier', entityId: number): Promise<DocumentVerificationResponse[]> {
    const results: DocumentVerificationResponse[] = [];

    if (entityType === 'customer') {
      const documents = await this.customerDocumentRepo.find({
        where: { customerId: entityId, validationStatus: CustomerDocumentValidationStatus.PENDING },
      });

      for (const doc of documents) {
        const docType = this.mapCustomerDocumentType(doc.documentType);
        if (docType) {
          const result = await this.verifyDocument({ entityType, entityId, documentId: doc.id });
          results.push(result);
        }
      }
    } else {
      const documents = await this.supplierDocumentRepo.find({
        where: { supplierId: entityId, validationStatus: SupplierDocumentValidationStatus.PENDING },
      });

      for (const doc of documents) {
        const docType = this.mapSupplierDocumentType(doc.documentType);
        if (docType) {
          const result = await this.verifyDocument({ entityType, entityId, documentId: doc.id });
          results.push(result);
        }
      }
    }

    return results;
  }
}
