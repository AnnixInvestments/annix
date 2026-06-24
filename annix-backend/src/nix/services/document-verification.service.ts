import { Injectable, Logger } from "@nestjs/common";
import { CustomerDocumentRepository } from "../../customer/customer-document.repository";
import { CustomerProfileRepository } from "../../customer/customer-profile.repository";
import {
  CustomerDocument,
  CustomerDocumentType,
  CustomerDocumentValidationStatus,
} from "../../customer/entities/customer-document.entity";
import { now } from "../../lib/datetime";
import { Company } from "../../platform/entities/company.entity";
import { S3StorageService } from "../../storage/s3-storage.service";
import {
  SupplierDocument,
  SupplierDocumentType,
  SupplierDocumentValidationStatus,
} from "../../supplier/entities/supplier-document.entity";
import { SupplierDocumentRepository } from "../../supplier/supplier-document.repository";
import { SupplierProfileRepository } from "../../supplier/supplier-profile.repository";
import {
  ExpectedCompanyData,
  RegistrationDocumentType,
  RegistrationDocumentVerifierService,
  RegistrationVerificationResult,
} from "./registration-document-verifier.service";

export interface DocumentVerificationRequest {
  entityType: "customer" | "supplier";
  entityId: number;
  documentId: number;
}

export interface DocumentVerificationResponse {
  success: boolean;
  documentId: number;
  entityType: "customer" | "supplier";
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
    private readonly customerDocumentRepo: CustomerDocumentRepository,
    private readonly customerProfileRepo: CustomerProfileRepository,
    private readonly supplierDocumentRepo: SupplierDocumentRepository,
    private readonly supplierProfileRepo: SupplierProfileRepository,
    private readonly storageService: S3StorageService,
    private readonly verifierService: RegistrationDocumentVerifierService,
  ) {}

  async verifyDocument(
    request: DocumentVerificationRequest,
  ): Promise<DocumentVerificationResponse> {
    const { entityType, entityId, documentId } = request;

    try {
      if (entityType === "customer") {
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
        validationStatus: "failed",
        allFieldsMatch: false,
        requiresManualReview: true,
        errorMessage: error.message,
      };
    }
  }

  private async verifyCustomerDocument(
    customerId: number,
    documentId: number,
  ): Promise<DocumentVerificationResponse> {
    const document = await this.customerDocumentRepo.findOneWhere({
      id: documentId,
      customerId,
    });

    if (!document) {
      throw new Error("Customer document not found");
    }

    const profile = await this.customerProfileRepo.findById(customerId, ["company"]);

    if (!profile?.company) {
      throw new Error("Customer company not found");
    }

    const docType = this.mapCustomerDocumentType(document.documentType);
    if (!docType) {
      this.logger.log(`Document type ${document.documentType} does not require verification`);
      return {
        success: true,
        documentId,
        entityType: "customer",
        verificationResult: null,
        validationStatus: CustomerDocumentValidationStatus.PENDING,
        allFieldsMatch: true,
        requiresManualReview: false,
      };
    }

    const expectedData = this.buildExpectedDataFromCompany(profile.company);
    const fileBuffer = await this.storageService.download(document.filePath);
    const multerFile = this.bufferToMulterFile(fileBuffer, document.fileName, document.mimeType);

    const verificationResult = await this.verifierService.verifyDocument(
      multerFile,
      docType,
      expectedData,
    );

    await this.updateCustomerDocumentWithVerification(document, verificationResult);

    const requiresManualReview =
      !verificationResult.allFieldsMatch || verificationResult.overallConfidence < 0.7;

    return {
      success: verificationResult.success,
      documentId,
      entityType: "customer",
      verificationResult,
      validationStatus: document.validationStatus,
      allFieldsMatch: verificationResult.allFieldsMatch,
      requiresManualReview,
    };
  }

  private async verifySupplierDocument(
    supplierId: number,
    documentId: number,
  ): Promise<DocumentVerificationResponse> {
    const document = await this.supplierDocumentRepo.findByIdAndSupplierId(documentId, supplierId);

    if (!document) {
      throw new Error("Supplier document not found");
    }

    const profile = await this.supplierProfileRepo.findByIdWithRelations(supplierId, ["company"]);

    if (!profile?.company) {
      throw new Error("Supplier company not found");
    }

    const docType = this.mapSupplierDocumentType(document.documentType);
    if (!docType) {
      this.logger.log(`Document type ${document.documentType} does not require verification`);
      return {
        success: true,
        documentId,
        entityType: "supplier",
        verificationResult: null,
        validationStatus: SupplierDocumentValidationStatus.PENDING,
        allFieldsMatch: true,
        requiresManualReview: false,
      };
    }

    const expectedData = this.buildExpectedDataFromCompany(profile.company);
    const fileBuffer = await this.storageService.download(document.filePath);
    const multerFile = this.bufferToMulterFile(fileBuffer, document.fileName, document.mimeType);

    const verificationResult = await this.verifierService.verifyDocument(
      multerFile,
      docType,
      expectedData,
    );

    await this.updateSupplierDocumentWithVerification(document, verificationResult);

    const requiresManualReview =
      !verificationResult.allFieldsMatch || verificationResult.overallConfidence < 0.7;

    return {
      success: verificationResult.success,
      documentId,
      entityType: "supplier",
      verificationResult,
      validationStatus: document.validationStatus,
      allFieldsMatch: verificationResult.allFieldsMatch,
      requiresManualReview,
    };
  }

  private mapCustomerDocumentType(docType: CustomerDocumentType): RegistrationDocumentType | null {
    const mapping: Partial<Record<CustomerDocumentType, RegistrationDocumentType>> = {
      [CustomerDocumentType.VAT_CERT]: "vat",
      [CustomerDocumentType.REGISTRATION_CERT]: "registration",
      [CustomerDocumentType.BEE_CERT]: "bee",
    };
    return mapping[docType] ?? null;
  }

  private mapSupplierDocumentType(docType: SupplierDocumentType): RegistrationDocumentType | null {
    const mapping: Partial<Record<SupplierDocumentType, RegistrationDocumentType>> = {
      [SupplierDocumentType.VAT_CERT]: "vat",
      [SupplierDocumentType.REGISTRATION_CERT]: "registration",
      [SupplierDocumentType.BEE_CERT]: "bee",
    };
    return mapping[docType] ?? null;
  }

  private buildExpectedDataFromCompany(company: Company): ExpectedCompanyData {
    return {
      vatNumber: company.vatNumber ?? undefined,
      registrationNumber: company.registrationNumber ?? undefined,
      companyName: company.legalName ?? undefined,
      streetAddress: company.address?.streetAddress ?? undefined,
      city: company.address?.city ?? undefined,
      provinceState: company.address?.province ?? undefined,
      postalCode: company.address?.postalCode ?? undefined,
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
      expected: String(fr.expected ?? ""),
      extracted: String(fr.extracted ?? ""),
      matches: fr.match,
      similarity: fr.similarity ?? (fr.match ? 100 : 0),
    }));

    if (!result.success) {
      document.validationStatus = CustomerDocumentValidationStatus.FAILED;
      document.validationNotes = "OCR processing failed";
    } else if (result.allFieldsMatch && result.overallConfidence >= 0.7) {
      document.validationStatus = CustomerDocumentValidationStatus.VALID;
      document.validationNotes = "Automatic validation passed";
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
      expected: String(fr.expected ?? ""),
      extracted: String(fr.extracted ?? ""),
      matches: fr.match,
      similarity: fr.similarity ?? (fr.match ? 100 : 0),
    }));

    if (!result.success) {
      document.validationStatus = SupplierDocumentValidationStatus.FAILED;
      document.validationNotes = "OCR processing failed";
    } else if (result.allFieldsMatch && result.overallConfidence >= 0.7) {
      document.validationStatus = SupplierDocumentValidationStatus.VALID;
      document.validationNotes = "Automatic validation passed";
    } else {
      document.validationStatus = SupplierDocumentValidationStatus.MANUAL_REVIEW;
      document.validationNotes = this.verifierService.generateMismatchReport(result);
    }

    await this.supplierDocumentRepo.save(document);
  }

  private bufferToMulterFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Express.Multer.File {
    return {
      fieldname: "file",
      originalname: filename,
      encoding: "7bit",
      mimetype: mimeType,
      size: buffer.length,
      buffer,
      stream: null as any,
      destination: "",
      filename: filename,
      path: "",
    };
  }

  async verifyAllPendingDocuments(
    entityType: "customer" | "supplier",
    entityId: number,
  ): Promise<DocumentVerificationResponse[]> {
    const results: DocumentVerificationResponse[] = [];

    if (entityType === "customer") {
      const documents = await this.customerDocumentRepo.findManyWhere({
        customerId: entityId,
        validationStatus: CustomerDocumentValidationStatus.PENDING,
      });

      for (const doc of documents) {
        const docType = this.mapCustomerDocumentType(doc.documentType);
        if (docType) {
          const result = await this.verifyDocument({
            entityType,
            entityId,
            documentId: doc.id,
          });
          results.push(result);
        }
      }
    } else {
      const documents = await this.supplierDocumentRepo.findManyWhere({
        supplierId: entityId,
        validationStatus: SupplierDocumentValidationStatus.PENDING,
      });

      for (const doc of documents) {
        const docType = this.mapSupplierDocumentType(doc.documentType);
        if (docType) {
          const result = await this.verifyDocument({
            entityType,
            entityId,
            documentId: doc.id,
          });
          results.push(result);
        }
      }
    }

    return results;
  }
}
