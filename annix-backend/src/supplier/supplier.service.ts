import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { BoqDistributionService } from "../boq/boq-distribution.service";
import { fromISO, now } from "../lib/datetime";
import { TransactionRunner } from "../lib/persistence/transaction-runner";
import { Address, ContactDetails } from "../lib/value-objects";
import { DocumentVerificationService } from "../nix/services/document-verification.service";
import { CompanyRepository } from "../platform/company.repository";
import { Company, CompanyType } from "../platform/entities/company.entity";
import { SecureDocumentsService } from "../secure-documents/secure-documents.service";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import {
  SaveSupplierCapabilitiesDto,
  SupplierCompanyDto,
  SupplierDocumentResponseDto,
  UpdateSupplierProfileDto,
  UploadSupplierDocumentDto,
} from "./dto";
import {
  SupplierDocument,
  SupplierDocumentType,
  SupplierDocumentValidationStatus,
  SupplierOnboardingStatus,
  SupplierProfile,
} from "./entities";
import { ProductCategory } from "./entities/supplier-capability.entity";
import { SupplierCapabilityRepository } from "./supplier-capability.repository";
import { SupplierDocumentRepository } from "./supplier-document.repository";
import { SupplierOnboardingRepository } from "./supplier-onboarding.repository";
import { SupplierProfileRepository } from "./supplier-profile.repository";

// Required documents for onboarding
const REQUIRED_DOCUMENT_TYPES = [
  SupplierDocumentType.REGISTRATION_CERT,
  SupplierDocumentType.TAX_CLEARANCE,
  SupplierDocumentType.BEE_CERT,
];

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    private readonly profileRepository: SupplierProfileRepository,
    private readonly companyRepo: CompanyRepository,
    private readonly onboardingRepository: SupplierOnboardingRepository,
    private readonly documentRepository: SupplierDocumentRepository,
    private readonly capabilityRepository: SupplierCapabilityRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly txRunner: TransactionRunner,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => BoqDistributionService))
    private readonly boqDistributionService: BoqDistributionService,
    @Inject(forwardRef(() => DocumentVerificationService))
    private readonly documentVerificationService: DocumentVerificationService,
    private readonly secureDocumentsService: SecureDocumentsService,
  ) {}

  /**
   * Get supplier profile by ID
   */
  async getProfile(supplierId: number): Promise<SupplierProfile> {
    const profile = await this.profileRepository.findByIdWithRelations(supplierId, [
      "company",
      "onboarding",
      "documents",
      "user",
    ]);

    if (!profile) {
      throw new NotFoundException("Supplier profile not found");
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
    const profile = await this.profileRepository.findById(supplierId);

    if (!profile) {
      throw new NotFoundException("Supplier profile not found");
    }

    const oldValues = { ...profile };

    if (dto.firstName !== undefined) profile.firstName = dto.firstName;
    if (dto.lastName !== undefined) profile.lastName = dto.lastName;
    if (dto.jobTitle !== undefined) profile.jobTitle = dto.jobTitle;
    if (dto.directPhone !== undefined) profile.directPhone = dto.directPhone;
    if (dto.mobilePhone !== undefined) profile.mobilePhone = dto.mobilePhone;

    if (dto.acceptTerms) {
      profile.termsAcceptedAt = now().toJSDate();
    }
    if (dto.acceptSecurityPolicy) {
      profile.securityPolicyAcceptedAt = now().toJSDate();
    }

    const savedProfile = await this.profileRepository.save(profile);

    await this.auditService.log({
      entityType: "supplier_profile",
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
    const profile = await this.profileRepository.findByIdWithRelations(supplierId, [
      "onboarding",
      "documents",
      "company",
    ]);

    if (!profile) {
      throw new NotFoundException("Supplier profile not found");
    }

    const onboarding = profile.onboarding;
    if (!onboarding) {
      throw new NotFoundException("Onboarding record not found");
    }

    // Check company details
    const companyDetailsComplete = !!profile.company && this.isCompanyComplete(profile.company);

    // Check documents
    const uploadedTypes = profile.documents?.map((d) => d.documentType) || [];
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter(
      (type) => !uploadedTypes.includes(type),
    );
    const documentsComplete = missingDocuments.length === 0;

    // Update onboarding record if needed
    if (
      onboarding.companyDetailsComplete !== companyDetailsComplete ||
      onboarding.documentsComplete !== documentsComplete
    ) {
      onboarding.companyDetailsComplete = companyDetailsComplete;
      onboarding.documentsComplete = documentsComplete;
      await this.onboardingRepository.save(onboarding);
    }

    const canSubmit =
      companyDetailsComplete &&
      documentsComplete &&
      (onboarding.status === SupplierOnboardingStatus.DRAFT ||
        onboarding.status === SupplierOnboardingStatus.REJECTED);

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
  ): Promise<Company> {
    const profile = await this.profileRepository.findByIdWithRelations(supplierId, [
      "company",
      "onboarding",
    ]);

    if (!profile) {
      throw new NotFoundException("Supplier profile not found");
    }

    // Check onboarding status
    if (profile.onboarding?.status === SupplierOnboardingStatus.APPROVED) {
      throw new BadRequestException("Cannot modify company details after approval");
    }

    return this.txRunner.run(async (ctx) => {
      const profileRepo = this.profileRepository.withTransaction(ctx);
      const onboardingRepo = this.onboardingRepository.withTransaction(ctx);
      const companyRepo = this.companyRepo.withTransaction(ctx);

      let company: Company;

      const address = Address.fromParts({
        streetAddress: dto.streetAddress,
        city: dto.city,
        province: dto.provinceState,
        postalCode: dto.postalCode,
      });
      const contact = ContactDetails.fromParts({
        phone: dto.primaryPhone || dto.primaryContactPhone,
        email: dto.generalEmail || dto.primaryContactEmail,
      });

      if (profile.company) {
        const oldValues = { ...profile.company };
        Object.assign(profile.company, {
          name: dto.legalName || profile.company.name,
          legalName: dto.legalName,
          tradingName: dto.tradingName,
          registrationNumber: dto.registrationNumber,
          vatNumber: dto.vatNumber,
          address,
          country: dto.country || profile.company.country,
          contactPerson: dto.primaryContactName,
          contact,
          websiteUrl: dto.website,
          industry: dto.industryType,
          companySize: dto.companySize,
          beeLevel: dto.beeLevel,
          beeCertificateExpiry: dto.beeCertificateExpiry,
          beeVerificationAgency: dto.beeVerificationAgency,
          isExemptMicroEnterprise: dto.isExemptMicroEnterprise,
        });
        company = await companyRepo.save(profile.company);

        await this.auditService.log({
          entityType: "supplier_company",
          entityId: company.id,
          action: AuditAction.UPDATE,
          oldValues: { legalName: oldValues.legalName },
          newValues: { legalName: dto.legalName },
          ipAddress: clientIp,
        });
      } else {
        company = await companyRepo.create({
          name: dto.legalName,
          companyType: CompanyType.SUPPLIER,
          legalName: dto.legalName,
          tradingName: dto.tradingName,
          registrationNumber: dto.registrationNumber,
          vatNumber: dto.vatNumber,
          address,
          country: dto.country || "South Africa",
          contactPerson: dto.primaryContactName,
          contact,
          websiteUrl: dto.website,
          industry: dto.industryType,
          companySize: dto.companySize,
          beeLevel: dto.beeLevel,
          beeCertificateExpiry: dto.beeCertificateExpiry
            ? fromISO(dto.beeCertificateExpiry).toJSDate()
            : null,
          beeVerificationAgency: dto.beeVerificationAgency,
          isExemptMicroEnterprise: dto.isExemptMicroEnterprise || false,
        });

        // Link to profile
        profile.companyId = company.id;
        await profileRepo.save(profile);

        await this.auditService.log({
          entityType: "supplier_company",
          entityId: company.id,
          action: AuditAction.CREATE,
          newValues: {
            legalName: dto.legalName,
            registrationNumber: dto.registrationNumber,
          },
          ipAddress: clientIp,
        });
      }

      // Update onboarding company details status
      if (profile.onboarding) {
        profile.onboarding.companyDetailsComplete = this.isCompanyComplete(company);
        await onboardingRepo.save(profile.onboarding);
      }

      return company;
    });
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
    const profile = await this.profileRepository.findByIdWithRelations(supplierId, ["onboarding"]);

    if (!profile) {
      throw new NotFoundException("Supplier profile not found");
    }

    if (profile.onboarding?.status === SupplierOnboardingStatus.APPROVED) {
      throw new BadRequestException("Cannot upload documents after approval");
    }

    // Check if document of this type already exists
    const existingDoc = await this.documentRepository.findBySupplierIdAndType(
      supplierId,
      dto.documentType,
    );

    if (existingDoc) {
      // Delete old file
      try {
        await this.storageService.delete(existingDoc.filePath);
      } catch (error) {
        this.logger.warn(`Failed to delete old document: ${existingDoc.filePath}`);
      }
      await this.documentRepository.remove(existingDoc);
    }

    // Upload new file
    const storagePath = `annix-app/suppliers/${supplierId}/documents`;
    const storageResult = await this.storageService.upload(file, storagePath);

    // Determine validation status and prepare document data
    const hasPreVerification = dto.verificationResult?.success === true;
    let validationStatus = SupplierDocumentValidationStatus.PENDING;
    let ocrExtractedData: SupplierDocument["ocrExtractedData"] = null;
    let fieldResults: SupplierDocument["fieldResults"] = null;
    let verificationConfidence: number | null = null;
    let allFieldsMatch: boolean | null = null;
    let validationNotes: string | null = null;
    let ocrProcessedAt: Date | null = null;

    if (hasPreVerification && dto.verificationResult) {
      const vr = dto.verificationResult;
      ocrExtractedData = vr.extractedData
        ? {
            vatNumber: vr.extractedData.vatNumber,
            registrationNumber: vr.extractedData.registrationNumber,
            companyName: vr.extractedData.companyName,
            streetAddress: vr.extractedData.streetAddress,
            city: vr.extractedData.city,
            provinceState: vr.extractedData.provinceState,
            postalCode: vr.extractedData.postalCode,
            beeLevel: vr.extractedData.beeLevel,
            beeExpiryDate: vr.extractedData.beeExpiryDate,
            confidence: vr.extractedData.confidence
              ? String(vr.extractedData.confidence)
              : undefined,
          }
        : null;

      fieldResults =
        vr.fieldResults?.map((fr) => ({
          fieldName: fr.field,
          expected: String(fr.expected ?? ""),
          extracted: String(fr.extracted ?? ""),
          matches: fr.match,
          similarity: fr.similarity ?? (fr.match ? 100 : 0),
        })) ?? null;

      verificationConfidence = vr.overallConfidence ?? null;
      allFieldsMatch = vr.allFieldsMatch ?? null;
      ocrProcessedAt = now().toJSDate();

      if (vr.allFieldsMatch && vr.overallConfidence >= 0.7) {
        validationStatus = SupplierDocumentValidationStatus.VALID;
        validationNotes = "Automatic validation passed";
      } else {
        validationStatus = SupplierDocumentValidationStatus.MANUAL_REVIEW;
        validationNotes = "Document requires manual review";
      }

      this.logger.log(
        `Using pre-verified data for document upload (confidence: ${vr.overallConfidence}, allMatch: ${vr.allFieldsMatch})`,
      );
    }

    // Create document record
    const savedDocument = await this.documentRepository.create({
      supplierId,
      documentType: dto.documentType,
      fileName: file.originalname,
      filePath: storageResult.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      validationStatus,
      expiryDate: dto.expiryDate ? fromISO(dto.expiryDate).toJSDate() : null,
      isRequired: REQUIRED_DOCUMENT_TYPES.includes(dto.documentType),
      ocrExtractedData,
      fieldResults,
      verificationConfidence,
      allFieldsMatch,
      validationNotes,
      ocrProcessedAt,
    });

    // Update onboarding documents status
    await this.updateDocumentsStatus(supplierId);

    await this.auditService.log({
      entityType: "supplier_document",
      entityId: savedDocument.id,
      action: AuditAction.UPLOAD,
      newValues: {
        documentType: dto.documentType,
        fileName: file.originalname,
        fileSize: file.size,
        hasPreVerification,
      },
      ipAddress: clientIp,
    });

    // Only trigger async verification if no pre-verified data was provided
    if (!hasPreVerification) {
      this.triggerVerification(supplierId, savedDocument.id);
    }

    this.copyToSecureStorage(supplierId, file, dto.documentType);

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

  private triggerVerification(supplierId: number, documentId: number): void {
    setImmediate(async () => {
      try {
        this.logger.log(`Triggering verification for supplier document ${documentId}`);
        await this.documentVerificationService.verifyDocument({
          entityType: "supplier",
          entityId: supplierId,
          documentId,
        });
        this.logger.log(`Verification completed for supplier document ${documentId}`);
      } catch (error: any) {
        this.logger.error(
          `Verification failed for supplier document ${documentId}: ${error.message}`,
        );
      }
    });
  }

  private copyToSecureStorage(
    supplierId: number,
    file: Express.Multer.File,
    documentType: SupplierDocumentType,
  ): void {
    setImmediate(async () => {
      try {
        const profile = await this.profileRepository.findByIdWithRelations(supplierId, ["user"]);
        if (!profile) {
          this.logger.warn(`Profile not found for supplier ${supplierId} - skipping secure copy`);
          return;
        }

        await this.secureDocumentsService.createFromEntityDocument(
          "supplier",
          supplierId,
          documentType,
          file.buffer,
          file.originalname,
          file.mimetype,
          profile.user.id,
        );
        this.logger.log(`Copied document to secure storage for supplier ${supplierId}`);
      } catch (error: any) {
        this.logger.error(
          `Failed to copy document to secure storage for supplier ${supplierId}: ${error.message}`,
        );
      }
    });
  }

  /**
   * Get documents for supplier
   */
  async getDocuments(supplierId: number): Promise<SupplierDocumentResponseDto[]> {
    const documents = await this.documentRepository.findBySupplierIdOrdered(supplierId);

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

  /**
   * Delete document
   */
  async deleteDocument(supplierId: number, documentId: number, clientIp: string): Promise<void> {
    const document = await this.documentRepository.findByIdAndSupplierId(documentId, supplierId);

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    const profile = await this.profileRepository.findByIdWithRelations(supplierId, ["onboarding"]);

    if (profile?.onboarding?.status === SupplierOnboardingStatus.APPROVED) {
      throw new BadRequestException("Cannot delete documents after approval");
    }

    // Delete file from storage
    try {
      await this.storageService.delete(document.filePath);
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${document.filePath}`);
    }

    await this.documentRepository.remove(document);

    // Update onboarding documents status
    await this.updateDocumentsStatus(supplierId);

    await this.auditService.log({
      entityType: "supplier_document",
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
  async submitOnboarding(
    supplierId: number,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepository.findByIdWithRelations(supplierId, [
      "onboarding",
      "company",
      "documents",
    ]);

    if (!profile) {
      throw new NotFoundException("Supplier profile not found");
    }

    const onboarding = profile.onboarding;
    if (!onboarding) {
      throw new NotFoundException("Onboarding record not found");
    }

    // Validate current status
    if (
      onboarding.status !== SupplierOnboardingStatus.DRAFT &&
      onboarding.status !== SupplierOnboardingStatus.REJECTED
    ) {
      throw new BadRequestException("Onboarding cannot be submitted in current status");
    }

    // Validate company details
    if (!profile.company || !this.isCompanyComplete(profile.company)) {
      throw new BadRequestException("Company details are incomplete");
    }

    // Validate documents
    const uploadedTypes = profile.documents?.map((d) => d.documentType) || [];
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter(
      (type) => !uploadedTypes.includes(type),
    );

    if (missingDocuments.length > 0) {
      throw new BadRequestException(`Missing required documents: ${missingDocuments.join(", ")}`);
    }

    // Update onboarding status
    onboarding.status = SupplierOnboardingStatus.SUBMITTED;
    onboarding.submittedAt = now().toJSDate();
    onboarding.companyDetailsComplete = true;
    onboarding.documentsComplete = true;

    if (onboarding.rejectionReason) {
      onboarding.resubmissionCount += 1;
      onboarding.rejectionReason = null;
      onboarding.remediationSteps = null;
    }

    await this.onboardingRepository.save(onboarding);

    await this.auditService.log({
      entityType: "supplier_onboarding",
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
      message: "Onboarding submitted for review. You will be notified of the outcome.",
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
      submittedAt?: Date | null;
    };
    documents: {
      total: number;
      pending: number;
      valid: number;
      invalid: number;
    };
  }> {
    const profile = await this.profileRepository.findByIdWithRelations(supplierId, [
      "user",
      "company",
      "onboarding",
      "documents",
    ]);

    if (!profile) {
      throw new NotFoundException("Supplier profile not found");
    }

    const documents = profile.documents || [];
    const documentStats = {
      total: documents.length,
      pending: documents.filter(
        (d) => d.validationStatus === SupplierDocumentValidationStatus.PENDING,
      ).length,
      valid: documents.filter((d) => d.validationStatus === SupplierDocumentValidationStatus.VALID)
        .length,
      invalid: documents.filter(
        (d) =>
          d.validationStatus === SupplierDocumentValidationStatus.INVALID ||
          d.validationStatus === SupplierDocumentValidationStatus.FAILED,
      ).length,
    };

    return {
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.user?.email,
        companyName: profile.company?.tradingName || profile.company?.legalName || undefined,
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

  private isCompanyComplete(company: Company): boolean {
    return !!(
      company.legalName &&
      company.registrationNumber &&
      company.address?.streetAddress &&
      company.address?.city &&
      company.address?.province &&
      company.address?.postalCode &&
      company.contactPerson &&
      company.contact?.email &&
      company.contact?.phone
    );
  }

  private async updateDocumentsStatus(supplierId: number): Promise<void> {
    const documents = await this.documentRepository.findBySupplierId(supplierId);
    const uploadedTypes = documents.map((d) => d.documentType);
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter(
      (type) => !uploadedTypes.includes(type),
    );
    const documentsComplete = missingDocuments.length === 0;

    await this.onboardingRepository.updateDocumentsStatus(supplierId, documentsComplete);
  }

  /**
   * Get supplier capabilities (products/services they can offer)
   */
  async getCapabilities(supplierId: number): Promise<{ capabilities: string[] }> {
    const capabilities = await this.capabilityRepository.findActiveBySupplier(supplierId);

    return {
      capabilities: capabilities.map((c) => c.productCategory),
    };
  }

  /**
   * Save supplier capabilities (products/services they can offer)
   */
  async saveCapabilities(
    supplierId: number,
    dto: SaveSupplierCapabilitiesDto,
    clientIp: string,
  ): Promise<{ capabilities: string[]; message: string }> {
    const profile = await this.profileRepository.findByIdWithRelations(supplierId, ["onboarding"]);

    if (!profile) {
      throw new NotFoundException("Supplier profile not found");
    }

    const existingCapabilities = await this.capabilityRepository.findBySupplier(supplierId);

    const existingCategories = existingCapabilities.map((c) => c.productCategory);
    const newCategories = dto.capabilities;

    const toAdd = newCategories.filter((c) => !existingCategories.includes(c as ProductCategory));
    const toRemove = existingCapabilities.filter((c) => !newCategories.includes(c.productCategory));

    await Promise.all(toRemove.map((cap) => this.capabilityRepository.removeById(cap.id)));

    const timestamp = now().toJSDate();
    await Promise.all(
      toAdd.map((category) =>
        this.capabilityRepository.create({
          supplierProfileId: supplierId,
          productCategory: category as ProductCategory,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      ),
    );

    await this.auditService.log({
      entityType: "supplier_capabilities",
      entityId: supplierId,
      action: AuditAction.UPDATE,
      oldValues: { capabilities: existingCategories },
      newValues: { capabilities: newCategories },
      ipAddress: clientIp,
    });

    await this.boqDistributionService.updateSupplierAllowedSections(supplierId, newCategories);

    return {
      capabilities: newCategories,
      message: "Capabilities saved successfully",
    };
  }
}
