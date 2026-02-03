import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { now } from '../lib/datetime';

import {
  CustomerProfile,
  CustomerOnboarding,
  CustomerDocument,
} from './entities';
import { CustomerOnboardingStatus } from './entities/customer-onboarding.entity';
import {
  CustomerDocumentType,
  CustomerDocumentValidationStatus,
} from './entities/customer-document.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { EmailService } from '../email/email.service';
import { S3StorageService } from '../storage/s3-storage.service';
import { DocumentVerificationService } from '../nix/services/document-verification.service';

// File constraints
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
];

@Injectable()
export class CustomerDocumentService {
  private readonly logger = new Logger(CustomerDocumentService.name);

  constructor(
    @InjectRepository(CustomerDocument)
    private readonly documentRepo: Repository<CustomerDocument>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    @InjectRepository(CustomerOnboarding)
    private readonly onboardingRepo: Repository<CustomerOnboarding>,
    private readonly storageService: S3StorageService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => DocumentVerificationService))
    private readonly documentVerificationService: DocumentVerificationService,
  ) {}

  async getDocuments(customerId: number) {
    const documents = await this.documentRepo.find({
      where: { customerId },
      order: { uploadedAt: 'DESC' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      uploadedAt: doc.uploadedAt,
      validationStatus: doc.validationStatus,
      validationNotes: doc.validationNotes ?? undefined,
      expiryDate: doc.expiryDate ?? undefined,
      isRequired: doc.isRequired,
    }));
  }

  async uploadDocument(
    customerId: number,
    file: Express.Multer.File,
    documentType: CustomerDocumentType,
    expiryDate: Date | null,
    clientIp: string,
  ) {
    // Validate onboarding status
    const onboarding = await this.onboardingRepo.findOne({
      where: { customerId },
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    // Check if there's an existing invalid document of this type that needs replacement
    const existingInvalidDoc = await this.documentRepo.findOne({
      where: {
        customerId,
        documentType,
        validationStatus: CustomerDocumentValidationStatus.INVALID,
      },
    });

    // Allow uploads in DRAFT/REJECTED status OR if replacing an invalid document
    if (
      ![
        CustomerOnboardingStatus.DRAFT,
        CustomerOnboardingStatus.REJECTED,
      ].includes(onboarding.status) &&
      !existingInvalidDoc
    ) {
      throw new ForbiddenException('Cannot upload documents at this stage');
    }

    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Check if document of same type already exists
    const existingDoc = await this.documentRepo.findOne({
      where: { customerId, documentType },
    });

    // Upload file to storage (S3 or local based on STORAGE_TYPE env var)
    const subPath = `customers/${customerId}/documents`;
    const storageResult = await this.storageService.upload(file, subPath);

    if (existingDoc) {
      // Delete old file from storage
      try {
        await this.storageService.delete(existingDoc.filePath);
      } catch {
        // Ignore if old file doesn't exist
      }

      // Update existing record
      existingDoc.fileName = file.originalname;
      existingDoc.filePath = storageResult.path;
      existingDoc.fileSize = file.size;
      existingDoc.mimeType = file.mimetype;
      existingDoc.uploadedAt = now().toJSDate();
      existingDoc.validationStatus = CustomerDocumentValidationStatus.PENDING;
      existingDoc.validationNotes = null;
      existingDoc.expiryDate = expiryDate;
      existingDoc.reviewedAt = null;
      existingDoc.reviewedById = null;

      const savedDoc = await this.documentRepo.save(existingDoc);

      await this.auditService.log({
        entityType: 'customer_document',
        entityId: savedDoc.id,
        action: AuditAction.UPDATE,
        newValues: {
          documentType,
          fileName: file.originalname,
          fileSize: file.size,
        },
        ipAddress: clientIp,
      });

      this.triggerVerification(customerId, savedDoc.id);

      return {
        id: savedDoc.id,
        documentType: savedDoc.documentType,
        fileName: savedDoc.fileName,
        fileSize: savedDoc.fileSize,
        validationStatus: savedDoc.validationStatus,
        uploadedAt: savedDoc.uploadedAt,
      };
    }

    // Create new document record
    const document = this.documentRepo.create({
      customerId,
      documentType,
      fileName: file.originalname,
      filePath: storageResult.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      expiryDate,
      validationStatus: CustomerDocumentValidationStatus.PENDING,
      isRequired: true,
    });

    const savedDoc = await this.documentRepo.save(document);

    await this.auditService.log({
      entityType: 'customer_document',
      entityId: savedDoc.id,
      action: AuditAction.CREATE,
      newValues: {
        documentType,
        fileName: file.originalname,
        fileSize: file.size,
      },
      ipAddress: clientIp,
    });

    this.triggerVerification(customerId, savedDoc.id);

    return {
      id: savedDoc.id,
      documentType: savedDoc.documentType,
      fileName: savedDoc.fileName,
      fileSize: savedDoc.fileSize,
      validationStatus: savedDoc.validationStatus,
      uploadedAt: savedDoc.uploadedAt,
    };
  }

  private triggerVerification(customerId: number, documentId: number): void {
    setImmediate(async () => {
      try {
        this.logger.log(`Triggering verification for document ${documentId}`);
        await this.documentVerificationService.verifyDocument({
          entityType: 'customer',
          entityId: customerId,
          documentId,
        });
        this.logger.log(`Verification completed for document ${documentId}`);
      } catch (error: any) {
        this.logger.error(`Verification failed for document ${documentId}: ${error.message}`);
      }
    });
  }

  async deleteDocument(
    customerId: number,
    documentId: number,
    clientIp: string,
  ) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, customerId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Validate onboarding status - allow deletion if document is invalid (rejected)
    const onboarding = await this.onboardingRepo.findOne({
      where: { customerId },
    });

    const isInvalidDocument =
      document.validationStatus === CustomerDocumentValidationStatus.INVALID;

    if (
      onboarding &&
      ![
        CustomerOnboardingStatus.DRAFT,
        CustomerOnboardingStatus.REJECTED,
      ].includes(onboarding.status) &&
      !isInvalidDocument
    ) {
      throw new ForbiddenException('Cannot delete documents at this stage');
    }

    // Delete file from storage
    try {
      await this.storageService.delete(document.filePath);
    } catch {
      // Ignore if file doesn't exist
    }

    await this.documentRepo.remove(document);

    await this.auditService.log({
      entityType: 'customer_document',
      entityId: documentId,
      action: AuditAction.DELETE,
      newValues: {
        documentType: document.documentType,
        fileName: document.fileName,
      },
      ipAddress: clientIp,
    });

    return { success: true, message: 'Document deleted successfully' };
  }

  async getDocumentFile(customerId: number, documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, customerId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const exists = await this.storageService.exists(document.filePath);
    if (!exists) {
      throw new NotFoundException('Document file not found');
    }

    const buffer = await this.storageService.download(document.filePath);

    return {
      buffer,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }

  /**
   * Update document validation status after OCR processing
   */
  async updateDocumentValidationStatus(
    documentId: number,
    ocrResult: {
      isValid: boolean;
      ocrFailed: boolean;
      requiresManualReview: boolean;
      extractedData: any;
      mismatches?: Array<{
        field: string;
        expected: string;
        extracted: string;
        similarity?: number;
      }>;
    },
    customerId: number,
  ) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, customerId },
      relations: ['customer', 'customer.company', 'customer.user'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Determine validation status based on OCR result
    let validationStatus: CustomerDocumentValidationStatus;
    let validationNotes: string | null = null;

    if (ocrResult.ocrFailed) {
      validationStatus = CustomerDocumentValidationStatus.MANUAL_REVIEW;
      validationNotes = 'OCR processing failed - requires manual review';
    } else if (ocrResult.requiresManualReview) {
      validationStatus = CustomerDocumentValidationStatus.MANUAL_REVIEW;
      if (ocrResult.mismatches && ocrResult.mismatches.length > 0) {
        const mismatchDetails = ocrResult.mismatches
          .map(
            (m) =>
              `${m.field}: expected "${m.expected}", found "${m.extracted}" (${m.similarity ? Math.round(m.similarity * 100) : 0}% match)`,
          )
          .join('; ');
        validationNotes = `Validation mismatches detected: ${mismatchDetails}`;
      } else {
        validationNotes =
          'Validation mismatches detected - requires manual review';
      }
    } else if (ocrResult.isValid) {
      validationStatus = CustomerDocumentValidationStatus.VALID;
      validationNotes = 'Automatic validation passed';
    } else {
      validationStatus = CustomerDocumentValidationStatus.INVALID;
      validationNotes = 'Validation failed';
    }

    // Update document
    document.validationStatus = validationStatus;
    document.validationNotes = validationNotes;
    document.ocrExtractedData = ocrResult.extractedData;
    document.ocrProcessedAt = now().toJSDate();
    document.ocrFailed = ocrResult.ocrFailed;

    await this.documentRepo.save(document);

    // Send admin notification if manual review is required
    if (validationStatus === CustomerDocumentValidationStatus.MANUAL_REVIEW) {
      await this.emailService.sendManualReviewNotification(
        document.customer.company.tradingName ||
          document.customer.company.legalName,
        document.customer.user.email,
        document.customer.id,
        document.documentType,
        validationNotes,
      );
    }

    await this.auditService.log({
      entityType: 'customer_document',
      entityId: documentId,
      action: AuditAction.UPDATE,
      newValues: {
        validationStatus,
        validationNotes,
        ocrFailed: ocrResult.ocrFailed,
        requiresManualReview: ocrResult.requiresManualReview,
      },
      ipAddress: 'system',
    });

    return {
      success: true,
      validationStatus,
      validationNotes,
      requiresManualReview:
        validationStatus === CustomerDocumentValidationStatus.MANUAL_REVIEW,
    };
  }
}
