import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

import {
  CustomerProfile,
  CustomerOnboarding,
  CustomerDocument,
} from './entities';
import { CustomerOnboardingStatus } from './entities/customer-onboarding.entity';
import { CustomerDocumentType, CustomerDocumentValidationStatus } from './entities/customer-document.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { EmailService } from '../email/email.service';

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
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(CustomerDocument)
    private readonly documentRepo: Repository<CustomerDocument>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    @InjectRepository(CustomerOnboarding)
    private readonly onboardingRepo: Repository<CustomerOnboarding>,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
        private readonly emailService: EmailService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
  }

  async getDocuments(customerId: number) {
    const documents = await this.documentRepo.find({
      where: { customerId },
      order: { uploadedAt: 'DESC' },
    });

    return documents.map(doc => ({
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

    // Only allow uploads in DRAFT or REJECTED status
    if (![CustomerOnboardingStatus.DRAFT, CustomerOnboardingStatus.REJECTED].includes(onboarding.status)) {
      throw new ForbiddenException('Cannot upload documents at this stage');
    }

    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Create upload directory if it doesn't exist
    const customerDir = path.join(this.uploadDir, 'customers', customerId.toString(), 'documents');
    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const safeFileName = `${documentType}_${timestamp}${ext}`;
    const filePath = path.join(customerDir, safeFileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Check if document of same type already exists
    const existingDoc = await this.documentRepo.findOne({
      where: { customerId, documentType },
    });

    if (existingDoc) {
      // Delete old file
      if (fs.existsSync(existingDoc.filePath)) {
        fs.unlinkSync(existingDoc.filePath);
      }
      // Update existing record
      existingDoc.fileName = file.originalname;
      existingDoc.filePath = filePath;
      existingDoc.fileSize = file.size;
      existingDoc.mimeType = file.mimetype;
      existingDoc.uploadedAt = new Date();
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
      filePath,
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

    return {
      id: savedDoc.id,
      documentType: savedDoc.documentType,
      fileName: savedDoc.fileName,
      fileSize: savedDoc.fileSize,
      validationStatus: savedDoc.validationStatus,
      uploadedAt: savedDoc.uploadedAt,
    };
  }

  async deleteDocument(customerId: number, documentId: number, clientIp: string) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, customerId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Validate onboarding status
    const onboarding = await this.onboardingRepo.findOne({
      where: { customerId },
    });

    if (onboarding && ![CustomerOnboardingStatus.DRAFT, CustomerOnboardingStatus.REJECTED].includes(onboarding.status)) {
      throw new ForbiddenException('Cannot delete documents at this stage');
    }

    // Delete file
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
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

    if (!fs.existsSync(document.filePath)) {
      throw new NotFoundException('Document file not found');
    }

    return {
      filePath: document.filePath,
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
      mismatches?: Array<{ field: string; expected: string; extracted: string; similarity?: number }>;
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
          .map(m => `${m.field}: expected "${m.expected}", found "${m.extracted}" (${m.similarity ? Math.round(m.similarity * 100) : 0}% match)`)
          .join('; ');
        validationNotes = `Validation mismatches detected: ${mismatchDetails}`;
      } else {
        validationNotes = 'Validation mismatches detected - requires manual review';
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
    document.ocrProcessedAt = new Date();
    document.ocrFailed = ocrResult.ocrFailed;

    await this.documentRepo.save(document);

    // Send admin notification if manual review is required
    if (validationStatus === CustomerDocumentValidationStatus.MANUAL_REVIEW) {
      await this.emailService.sendManualReviewNotification(
        document.customer.company.tradingName || document.customer.company.legalName,
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
      requiresManualReview: validationStatus === CustomerDocumentValidationStatus.MANUAL_REVIEW,
    };
  }
}
