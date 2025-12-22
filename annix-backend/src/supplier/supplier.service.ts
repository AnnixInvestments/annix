import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import {
  SupplierProfile,
  SupplierCompany,
  SupplierOnboarding,
  SupplierOnboardingStatus,
  SupplierDocument,
  SupplierDocumentType,
  SupplierDocumentValidationStatus,
} from './entities';
import {
  SupplierCompanyDto,
  UpdateSupplierProfileDto,
  UploadSupplierDocumentDto,
  SupplierDocumentResponseDto,
} from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { STORAGE_SERVICE, IStorageService } from '../storage/storage.interface';

// Required documents for onboarding
const REQUIRED_DOCUMENT_TYPES = [
  SupplierDocumentType.REGISTRATION_CERT,
  SupplierDocumentType.TAX_CLEARANCE,
  SupplierDocumentType.BEE_CERT,
  SupplierDocumentType.ISO_CERT,
  SupplierDocumentType.INSURANCE,
];

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    @InjectRepository(SupplierProfile)
    private readonly profileRepo: Repository<SupplierProfile>,
    @InjectRepository(SupplierCompany)
    private readonly companyRepo: Repository<SupplierCompany>,
    @InjectRepository(SupplierOnboarding)
    private readonly onboardingRepo: Repository<SupplierOnboarding>,
    @InjectRepository(SupplierDocument)
    private readonly documentRepo: Repository<SupplierDocument>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get supplier profile by ID
   */
  async getProfile(supplierId: number): Promise<SupplierProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['company', 'onboarding', 'documents', 'user'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier profile not found');
    }

    return profile;
  }

  /**
   * Update supplier profile
   */
  async updateProfile(
    supplierId: number,
    dto: UpdateSupplierProfileDto,
    clientIp: string,
  ): Promise<SupplierProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
    });

    if (!profile) {
      throw new NotFoundException('Supplier profile not found');
    }

    const oldValues = { ...profile };

    if (dto.firstName !== undefined) profile.firstName = dto.firstName;
    if (dto.lastName !== undefined) profile.lastName = dto.lastName;
    if (dto.jobTitle !== undefined) profile.jobTitle = dto.jobTitle;
    if (dto.directPhone !== undefined) profile.directPhone = dto.directPhone;
    if (dto.mobilePhone !== undefined) profile.mobilePhone = dto.mobilePhone;

    if (dto.acceptTerms) {
      profile.termsAcceptedAt = new Date();
    }
    if (dto.acceptSecurityPolicy) {
      profile.securityPolicyAcceptedAt = new Date();
    }

    const savedProfile = await this.profileRepo.save(profile);

    await this.auditService.log({
      entityType: 'supplier_profile',
      entityId: supplierId,
      action: AuditAction.UPDATE,
      oldValues: {
        firstName: oldValues.firstName,
        lastName: oldValues.lastName,
        jobTitle: oldValues.jobTitle,
      },
      newValues: dto,
      ipAddress: clientIp,
    });

    return savedProfile;
  }

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(supplierId: number): Promise<{
    status: SupplierOnboardingStatus;
    companyDetailsComplete: boolean;
    documentsComplete: boolean;
    missingDocuments: SupplierDocumentType[];
    rejectionReason?: string;
    remediationSteps?: string;
    canSubmit: boolean;
  }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['onboarding', 'documents', 'company'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier profile not found');
    }

    const onboarding = profile.onboarding;
    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    // Check company details
    const companyDetailsComplete = !!profile.company && this.isCompanyComplete(profile.company);

    // Check documents
    const uploadedTypes = profile.documents?.map(d => d.documentType) || [];
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter(type => !uploadedTypes.includes(type));
    const documentsComplete = missingDocuments.length === 0;

    // Update onboarding record if needed
    if (onboarding.companyDetailsComplete !== companyDetailsComplete || onboarding.documentsComplete !== documentsComplete) {
      onboarding.companyDetailsComplete = companyDetailsComplete;
      onboarding.documentsComplete = documentsComplete;
      await this.onboardingRepo.save(onboarding);
    }

    const canSubmit = companyDetailsComplete && documentsComplete &&
      (onboarding.status === SupplierOnboardingStatus.DRAFT || onboarding.status === SupplierOnboardingStatus.REJECTED);

    return {
      status: onboarding.status,
      companyDetailsComplete,
      documentsComplete,
      missingDocuments,
      rejectionReason: onboarding.rejectionReason ?? undefined,
      remediationSteps: onboarding.remediationSteps ?? undefined,
      canSubmit,
    };
  }

  /**
   * Save company details (draft or update)
   */
  async saveCompanyDetails(
    supplierId: number,
    dto: SupplierCompanyDto,
    clientIp: string,
  ): Promise<SupplierCompany> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['company', 'onboarding'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier profile not found');
    }

    // Check onboarding status
    if (profile.onboarding?.status === SupplierOnboardingStatus.APPROVED) {
      throw new BadRequestException('Cannot modify company details after approval');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let company: SupplierCompany;

      if (profile.company) {
        // Update existing company
        const oldValues = { ...profile.company };
        Object.assign(profile.company, dto);
        company = await queryRunner.manager.save(profile.company);

        await this.auditService.log({
          entityType: 'supplier_company',
          entityId: company.id,
          action: AuditAction.UPDATE,
          oldValues: { legalName: oldValues.legalName },
          newValues: { legalName: dto.legalName },
          ipAddress: clientIp,
        });
      } else {
        // Create new company
        company = this.companyRepo.create({
          ...dto,
          country: dto.country || 'South Africa',
        });
        company = await queryRunner.manager.save(company);

        // Link to profile
        profile.companyId = company.id;
        await queryRunner.manager.save(profile);

        await this.auditService.log({
          entityType: 'supplier_company',
          entityId: company.id,
          action: AuditAction.CREATE,
          newValues: { legalName: dto.legalName, registrationNumber: dto.registrationNumber },
          ipAddress: clientIp,
        });
      }

      // Update onboarding company details status
      if (profile.onboarding) {
        profile.onboarding.companyDetailsComplete = this.isCompanyComplete(company);
        await queryRunner.manager.save(profile.onboarding);
      }

      await queryRunner.commitTransaction();
      return company;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Upload document
   */
  async uploadDocument(
    supplierId: number,
    file: Express.Multer.File,
    dto: UploadSupplierDocumentDto,
    clientIp: string,
  ): Promise<SupplierDocumentResponseDto> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['onboarding'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier profile not found');
    }

    if (profile.onboarding?.status === SupplierOnboardingStatus.APPROVED) {
      throw new BadRequestException('Cannot upload documents after approval');
    }

    // Check if document of this type already exists
    const existingDoc = await this.documentRepo.findOne({
      where: { supplierId, documentType: dto.documentType },
    });

    if (existingDoc) {
      // Delete old file
      try {
        await this.storageService.delete(existingDoc.filePath);
      } catch (error) {
        this.logger.warn(`Failed to delete old document: ${existingDoc.filePath}`);
      }
      await this.documentRepo.remove(existingDoc);
    }

    // Upload new file
    const storagePath = `suppliers/${supplierId}/documents`;
    const storageResult = await this.storageService.upload(file, storagePath);

    // Create document record
    const document = this.documentRepo.create({
      supplierId,
      documentType: dto.documentType,
      fileName: file.originalname,
      filePath: storageResult.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      validationStatus: SupplierDocumentValidationStatus.PENDING,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      isRequired: REQUIRED_DOCUMENT_TYPES.includes(dto.documentType),
    });

    const savedDocument = await this.documentRepo.save(document);

    // Update onboarding documents status
    await this.updateDocumentsStatus(supplierId);

    await this.auditService.log({
      entityType: 'supplier_document',
      entityId: savedDocument.id,
      action: AuditAction.UPLOAD,
      newValues: {
        documentType: dto.documentType,
        fileName: file.originalname,
        fileSize: file.size,
      },
      ipAddress: clientIp,
    });

    return {
      id: savedDocument.id,
      documentType: savedDocument.documentType,
      fileName: savedDocument.fileName,
      fileSize: savedDocument.fileSize,
      mimeType: savedDocument.mimeType,
      uploadedAt: savedDocument.uploadedAt,
      validationStatus: savedDocument.validationStatus,
      expiryDate: savedDocument.expiryDate ?? undefined,
      isRequired: savedDocument.isRequired,
    };
  }

  /**
   * Get documents for supplier
   */
  async getDocuments(supplierId: number): Promise<SupplierDocumentResponseDto[]> {
    const documents = await this.documentRepo.find({
      where: { supplierId },
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

  /**
   * Delete document
   */
  async deleteDocument(supplierId: number, documentId: number, clientIp: string): Promise<void> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, supplierId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['onboarding'],
    });

    if (profile?.onboarding?.status === SupplierOnboardingStatus.APPROVED) {
      throw new BadRequestException('Cannot delete documents after approval');
    }

    // Delete file from storage
    try {
      await this.storageService.delete(document.filePath);
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${document.filePath}`);
    }

    await this.documentRepo.remove(document);

    // Update onboarding documents status
    await this.updateDocumentsStatus(supplierId);

    await this.auditService.log({
      entityType: 'supplier_document',
      entityId: documentId,
      action: AuditAction.DELETE,
      oldValues: {
        documentType: document.documentType,
        fileName: document.fileName,
      },
      ipAddress: clientIp,
    });
  }

  /**
   * Submit onboarding for review
   */
  async submitOnboarding(supplierId: number, clientIp: string): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['onboarding', 'company', 'documents'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier profile not found');
    }

    const onboarding = profile.onboarding;
    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    // Validate current status
    if (onboarding.status !== SupplierOnboardingStatus.DRAFT &&
        onboarding.status !== SupplierOnboardingStatus.REJECTED) {
      throw new BadRequestException('Onboarding cannot be submitted in current status');
    }

    // Validate company details
    if (!profile.company || !this.isCompanyComplete(profile.company)) {
      throw new BadRequestException('Company details are incomplete');
    }

    // Validate documents
    const uploadedTypes = profile.documents?.map(d => d.documentType) || [];
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter(type => !uploadedTypes.includes(type));

    if (missingDocuments.length > 0) {
      throw new BadRequestException(`Missing required documents: ${missingDocuments.join(', ')}`);
    }

    // Update onboarding status
    onboarding.status = SupplierOnboardingStatus.SUBMITTED;
    onboarding.submittedAt = new Date();
    onboarding.companyDetailsComplete = true;
    onboarding.documentsComplete = true;

    if (onboarding.rejectionReason) {
      onboarding.resubmissionCount += 1;
      onboarding.rejectionReason = null;
      onboarding.remediationSteps = null;
    }

    await this.onboardingRepo.save(onboarding);

    await this.auditService.log({
      entityType: 'supplier_onboarding',
      entityId: onboarding.id,
      action: AuditAction.SUBMIT,
      newValues: {
        status: SupplierOnboardingStatus.SUBMITTED,
        resubmissionCount: onboarding.resubmissionCount,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Onboarding submitted for review. You will be notified of the outcome.',
    };
  }

  /**
   * Get dashboard data
   */
  async getDashboard(supplierId: number): Promise<{
    profile: {
      firstName?: string;
      lastName?: string;
      email: string;
      companyName?: string;
    };
    onboarding: {
      status: SupplierOnboardingStatus;
      companyDetailsComplete: boolean;
      documentsComplete: boolean;
      submittedAt?: Date;
    };
    documents: {
      total: number;
      pending: number;
      valid: number;
      invalid: number;
    };
  }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['user', 'company', 'onboarding', 'documents'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier profile not found');
    }

    const documents = profile.documents || [];
    const documentStats = {
      total: documents.length,
      pending: documents.filter(d => d.validationStatus === SupplierDocumentValidationStatus.PENDING).length,
      valid: documents.filter(d => d.validationStatus === SupplierDocumentValidationStatus.VALID).length,
      invalid: documents.filter(d =>
        d.validationStatus === SupplierDocumentValidationStatus.INVALID ||
        d.validationStatus === SupplierDocumentValidationStatus.FAILED
      ).length,
    };

    return {
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.user?.email,
        companyName: profile.company?.tradingName || profile.company?.legalName,
      },
      onboarding: {
        status: profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
        companyDetailsComplete: profile.onboarding?.companyDetailsComplete || false,
        documentsComplete: profile.onboarding?.documentsComplete || false,
        submittedAt: profile.onboarding?.submittedAt,
      },
      documents: documentStats,
    };
  }

  // Private helper methods

  private isCompanyComplete(company: SupplierCompany): boolean {
    return !!(
      company.legalName &&
      company.registrationNumber &&
      company.streetAddress &&
      company.city &&
      company.provinceState &&
      company.postalCode &&
      company.primaryContactName &&
      company.primaryContactEmail &&
      company.primaryContactPhone
    );
  }

  private async updateDocumentsStatus(supplierId: number): Promise<void> {
    const documents = await this.documentRepo.find({ where: { supplierId } });
    const uploadedTypes = documents.map(d => d.documentType);
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter(type => !uploadedTypes.includes(type));
    const documentsComplete = missingDocuments.length === 0;

    await this.onboardingRepo.update(
      { supplierId },
      { documentsComplete },
    );
  }
}
