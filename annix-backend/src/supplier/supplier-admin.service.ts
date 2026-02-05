import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { now } from '../lib/datetime';

import {
  SupplierProfile,
  SupplierAccountStatus,
  SupplierCompany,
  SupplierOnboarding,
  SupplierOnboardingStatus,
  SupplierDocument,
  SupplierDocumentValidationStatus,
} from './entities';
import {
  RejectSupplierDto,
  SuspendSupplierDto,
  ReviewDocumentDto,
  SupplierListItemDto,
  SupplierDetailDto,
} from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { EmailService } from '../email/email.service';
import { User } from '../user/entities/user.entity';
import { S3StorageService } from '../storage/s3-storage.service';

@Injectable()
export class SupplierAdminService {
  private readonly logger = new Logger(SupplierAdminService.name);

  constructor(
    @InjectRepository(SupplierProfile)
    private readonly profileRepo: Repository<SupplierProfile>,
    @InjectRepository(SupplierCompany)
    private readonly companyRepo: Repository<SupplierCompany>,
    @InjectRepository(SupplierOnboarding)
    private readonly onboardingRepo: Repository<SupplierOnboarding>,
    @InjectRepository(SupplierDocument)
    private readonly documentRepo: Repository<SupplierDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly storageService: S3StorageService,
  ) {}

  /**
   * Get all suppliers with pagination
   */
  async getAllSuppliers(
    page: number = 1,
    limit: number = 20,
    accountStatus?: SupplierAccountStatus,
  ): Promise<{
    items: SupplierListItemDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.company', 'company')
      .leftJoinAndSelect('profile.onboarding', 'onboarding')
      .orderBy('profile.createdAt', 'DESC');

    if (accountStatus) {
      queryBuilder.andWhere('profile.accountStatus = :accountStatus', { accountStatus });
    }

    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    const profiles = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const items: SupplierListItemDto[] = profiles.map((profile) => ({
      id: profile.id,
      email: profile.user?.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      companyName: profile.company?.tradingName || profile.company?.legalName,
      accountStatus: profile.accountStatus,
      onboardingStatus:
        profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
      createdAt: profile.createdAt,
    }));

    return { items, total, page, totalPages };
  }

  /**
   * Get suppliers pending review
   */
  async getPendingReview(): Promise<SupplierListItemDto[]> {
    const profiles = await this.profileRepo.find({
      where: {
        onboarding: {
          status: SupplierOnboardingStatus.SUBMITTED,
        },
      },
      relations: ['user', 'company', 'onboarding'],
      order: { createdAt: 'ASC' },
    });

    return profiles.map((profile) => ({
      id: profile.id,
      email: profile.user?.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      companyName: profile.company?.tradingName || profile.company?.legalName,
      accountStatus: profile.accountStatus,
      onboardingStatus: profile.onboarding?.status,
      createdAt: profile.createdAt,
    }));
  }

  /**
   * Get supplier details
   */
  async getSupplierDetails(supplierId: number): Promise<SupplierDetailDto> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['user', 'company', 'onboarding', 'documents'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier not found');
    }

    return {
      id: profile.id,
      email: profile.user?.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      companyName: profile.company?.tradingName || profile.company?.legalName,
      accountStatus: profile.accountStatus,
      onboardingStatus:
        profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
      createdAt: profile.createdAt,
      company: profile.company
        ? {
            id: profile.company.id,
            legalName: profile.company.legalName,
            tradingName: profile.company.tradingName,
            registrationNumber: profile.company.registrationNumber,
            taxNumber: profile.company.taxNumber,
            vatNumber: profile.company.vatNumber,
            city: profile.company.city,
            provinceState: profile.company.provinceState,
            country: profile.company.country,
            primaryContactName: profile.company.primaryContactName,
            primaryContactEmail: profile.company.primaryContactEmail,
            primaryContactPhone: profile.company.primaryContactPhone,
            industryType: profile.company.industryType,
          }
        : undefined,
      documents: (profile.documents || []).map((doc) => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        validationStatus: doc.validationStatus,
        uploadedAt: doc.uploadedAt,
      })),
      onboarding: {
        status: profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
        companyDetailsComplete:
          profile.onboarding?.companyDetailsComplete || false,
        documentsComplete: profile.onboarding?.documentsComplete || false,
        submittedAt: profile.onboarding?.submittedAt,
        rejectionReason: profile.onboarding?.rejectionReason ?? undefined,
        remediationSteps: profile.onboarding?.remediationSteps ?? undefined,
        resubmissionCount: profile.onboarding?.resubmissionCount || 0,
      },
    };
  }

  /**
   * Review document (approve/reject)
   */
  async reviewDocument(
    supplierId: number,
    documentId: number,
    dto: ReviewDocumentDto,
    adminUserId: number,
    clientIp: string,
  ): Promise<SupplierDocument> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, supplierId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const oldStatus = document.validationStatus;

    document.validationStatus = dto.validationStatus;
    document.validationNotes = dto.validationNotes ?? null;
    document.reviewedById = adminUserId;
    document.reviewedAt = now().toJSDate();

    const savedDocument = await this.documentRepo.save(document);

    await this.auditService.log({
      entityType: 'supplier_document',
      entityId: documentId,
      action: AuditAction.UPDATE,
      oldValues: { validationStatus: oldStatus },
      newValues: {
        validationStatus: dto.validationStatus,
        validationNotes: dto.validationNotes,
        reviewedById: adminUserId,
      },
      ipAddress: clientIp,
    });

    return savedDocument;
  }

  /**
   * Approve supplier onboarding
   */
  async approveOnboarding(
    supplierId: number,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['user', 'company', 'onboarding'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier not found');
    }

    const onboarding = profile.onboarding;
    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    if (
      onboarding.status !== SupplierOnboardingStatus.SUBMITTED &&
      onboarding.status !== SupplierOnboardingStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Onboarding is not in a reviewable status');
    }

    // Update onboarding status
    onboarding.status = SupplierOnboardingStatus.APPROVED;
    onboarding.reviewedAt = now().toJSDate();
    onboarding.reviewedById = adminUserId;
    await this.onboardingRepo.save(onboarding);

    // Activate supplier account
    profile.accountStatus = SupplierAccountStatus.ACTIVE;
    await this.profileRepo.save(profile);

    // Send approval email
    if (profile.user?.email) {
      await this.emailService.sendSupplierApprovalEmail(
        profile.user.email,
        profile.company?.tradingName ||
          profile.company?.legalName ||
          'Your Company',
      );
    }

    await this.auditService.log({
      entityType: 'supplier_onboarding',
      entityId: onboarding.id,
      action: AuditAction.APPROVE,
      newValues: {
        status: SupplierOnboardingStatus.APPROVED,
        approvedById: adminUserId,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Supplier onboarding approved successfully',
    };
  }

  /**
   * Reject supplier onboarding
   */
  async rejectOnboarding(
    supplierId: number,
    dto: RejectSupplierDto,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['user', 'company', 'onboarding'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier not found');
    }

    const onboarding = profile.onboarding;
    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    if (
      onboarding.status !== SupplierOnboardingStatus.SUBMITTED &&
      onboarding.status !== SupplierOnboardingStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Onboarding is not in a reviewable status');
    }

    // Update onboarding status
    onboarding.status = SupplierOnboardingStatus.REJECTED;
    onboarding.reviewedAt = now().toJSDate();
    onboarding.reviewedById = adminUserId;
    onboarding.rejectionReason = dto.rejectionReason;
    onboarding.remediationSteps = dto.remediationSteps;
    await this.onboardingRepo.save(onboarding);

    // Send rejection email
    if (profile.user?.email) {
      await this.emailService.sendSupplierRejectionEmail(
        profile.user.email,
        profile.company?.tradingName ||
          profile.company?.legalName ||
          'Your Company',
        dto.rejectionReason,
        dto.remediationSteps,
      );
    }

    await this.auditService.log({
      entityType: 'supplier_onboarding',
      entityId: onboarding.id,
      action: AuditAction.REJECT,
      newValues: {
        status: SupplierOnboardingStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
        rejectedById: adminUserId,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Supplier onboarding rejected',
    };
  }

  /**
   * Start review (move to UNDER_REVIEW status)
   */
  async startReview(
    supplierId: number,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean }> {
    const onboarding = await this.onboardingRepo.findOne({
      where: { supplierId },
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    if (onboarding.status !== SupplierOnboardingStatus.SUBMITTED) {
      throw new BadRequestException('Onboarding is not in submitted status');
    }

    onboarding.status = SupplierOnboardingStatus.UNDER_REVIEW;
    await this.onboardingRepo.save(onboarding);

    await this.auditService.log({
      entityType: 'supplier_onboarding',
      entityId: onboarding.id,
      action: AuditAction.UPDATE,
      newValues: {
        status: SupplierOnboardingStatus.UNDER_REVIEW,
        reviewStartedById: adminUserId,
      },
      ipAddress: clientIp,
    });

    return { success: true };
  }

  /**
   * Suspend supplier account
   */
  async suspendSupplier(
    supplierId: number,
    dto: SuspendSupplierDto,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
    });

    if (!profile) {
      throw new NotFoundException('Supplier not found');
    }

    profile.accountStatus = SupplierAccountStatus.SUSPENDED;
    profile.suspensionReason = dto.reason;
    profile.suspendedAt = now().toJSDate();
    profile.suspendedBy = adminUserId;
    await this.profileRepo.save(profile);

    await this.auditService.log({
      entityType: 'supplier_profile',
      entityId: supplierId,
      action: AuditAction.UPDATE,
      newValues: {
        accountStatus: SupplierAccountStatus.SUSPENDED,
        suspensionReason: dto.reason,
        suspendedById: adminUserId,
      },
      ipAddress: clientIp,
    });

    return { success: true };
  }

  /**
   * Reactivate supplier account
   */
  async reactivateSupplier(
    supplierId: number,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
    });

    if (!profile) {
      throw new NotFoundException('Supplier not found');
    }

    profile.accountStatus = SupplierAccountStatus.ACTIVE;
    profile.suspensionReason = null;
    profile.suspendedAt = null;
    profile.suspendedBy = null;
    await this.profileRepo.save(profile);

    await this.auditService.log({
      entityType: 'supplier_profile',
      entityId: supplierId,
      action: AuditAction.UPDATE,
      newValues: {
        accountStatus: SupplierAccountStatus.ACTIVE,
        reactivatedById: adminUserId,
      },
      ipAddress: clientIp,
    });

    return { success: true };
  }

  async getDocumentReviewData(supplierId: number, documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, supplierId },
      relations: ['supplier', 'supplier.company', 'reviewedBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const url = await this.storageService.getPresignedUrl(document.filePath);
    const company = document.supplier.company;

    const expectedData = {
      companyName: company.legalName,
      tradingName: company.tradingName,
      registrationNumber: company.registrationNumber,
      vatNumber: company.vatNumber,
      streetAddress: company.streetAddress,
      city: company.city,
      provinceState: company.provinceState,
      postalCode: company.postalCode,
      beeLevel: company.beeLevel,
      beeCertificateExpiry: company.beeCertificateExpiry,
      beeVerificationAgency: company.beeVerificationAgency,
    };

    const extractedData = document.ocrExtractedData ?? {};

    const fieldComparison = this.buildFieldComparison(expectedData, extractedData, document.fieldResults ?? []);

    return {
      documentId: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      uploadedAt: document.uploadedAt,
      validationStatus: document.validationStatus,
      validationNotes: document.validationNotes,
      presignedUrl: url,
      ocrProcessedAt: document.ocrProcessedAt,
      ocrFailed: document.ocrFailed,
      verificationConfidence: document.verificationConfidence,
      allFieldsMatch: document.allFieldsMatch,
      expectedData,
      extractedData,
      fieldComparison,
      reviewedBy: document.reviewedBy?.username ?? null,
      reviewedAt: document.reviewedAt,
      supplier: {
        id: document.supplier.id,
        firstName: document.supplier.firstName,
        lastName: document.supplier.lastName,
      },
    };
  }

  private buildFieldComparison(
    expected: Record<string, any>,
    extracted: Record<string, any>,
    fieldResults: { fieldName: string; expected: string; extracted: string; matches: boolean; similarity: number }[],
  ) {
    const fieldResultsMap = new Map(fieldResults.map((fr) => [fr.fieldName, fr]));

    const fields = ['companyName', 'registrationNumber', 'vatNumber', 'streetAddress', 'city', 'provinceState', 'postalCode', 'beeLevel'];

    return fields.map((field) => {
      const storedResult = fieldResultsMap.get(field);
      const expectedValue = expected[field];
      const extractedValue = extracted[field];

      if (storedResult) {
        return {
          field,
          expected: expectedValue ?? null,
          extracted: extractedValue ?? null,
          matches: storedResult.matches,
          similarity: storedResult.similarity,
        };
      }

      const matches = this.valuesMatch(expectedValue, extractedValue);
      return {
        field,
        expected: expectedValue ?? null,
        extracted: extractedValue ?? null,
        matches,
        similarity: matches ? 100 : 0,
      };
    });
  }

  private valuesMatch(expected: any, extracted: any): boolean {
    if (expected === null || expected === undefined) return true;
    if (extracted === null || extracted === undefined) return false;
    return String(expected).toUpperCase().trim() === String(extracted).toUpperCase().trim();
  }

  async getDocumentPreviewImages(
    supplierId: number,
    documentId: number,
  ): Promise<{ pages: string[]; totalPages: number }> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, supplierId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.mimeType !== 'application/pdf') {
      const url = await this.storageService.getPresignedUrl(document.filePath);
      return {
        pages: [url],
        totalPages: 1,
      };
    }

    const buffer = await this.storageService.download(document.filePath);
    const pages = await this.convertPdfToImages(buffer);

    return {
      pages,
      totalPages: pages.length,
    };
  }

  private async convertPdfToImages(pdfBuffer: Buffer): Promise<string[]> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const execAsync = promisify(exec);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-preview-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    const outputPattern = path.join(tempDir, 'page-%d.png');

    this.logger.log('[PDF Preview] Starting conversion');

    try {
      await fs.writeFile(inputPath, pdfBuffer);

      const gsCommand = process.platform === 'win32'
        ? '"C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe"'
        : 'gs';
      const command = `${gsCommand} -dNOPAUSE -dBATCH -dSAFER -sDEVICE=png16m -r150 -dTextAlphaBits=4 -dGraphicsAlphaBits=4 "-sOutputFile=${outputPattern}" "${inputPath}"`;

      await execAsync(command, { timeout: 60000 });

      const files = await fs.readdir(tempDir);
      const pngFiles = files
        .filter((f: string) => f.startsWith('page-') && f.endsWith('.png'))
        .sort((a: string, b: string) => {
          const numA = parseInt(a.match(/page-(\d+)/)?.[1] || '0', 10);
          const numB = parseInt(b.match(/page-(\d+)/)?.[1] || '0', 10);
          return numA - numB;
        });

      const base64Images: string[] = [];
      for (const file of pngFiles) {
        const filePath = path.join(tempDir, file);
        const imageBuffer = await fs.readFile(filePath);
        base64Images.push(`data:image/png;base64,${imageBuffer.toString('base64')}`);
      }

      await fs.rm(tempDir, { recursive: true, force: true });

      return base64Images;
    } catch (error: any) {
      this.logger.error('[PDF Preview] Error:', error.message);
      await import('fs/promises').then(fs => fs.rm(tempDir, { recursive: true, force: true }).catch(() => {}));
      throw error;
    }
  }
}
