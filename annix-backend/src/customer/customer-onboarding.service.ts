import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CustomerProfile,
  CustomerOnboarding,
  CustomerDocument,
  CustomerCompany,
  CustomerAccountStatus,
} from './entities';
import { CustomerOnboardingStatus } from './entities/customer-onboarding.entity';
import { CustomerDocumentType, CustomerDocumentValidationStatus } from './entities/customer-document.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

// Required document types for onboarding
const REQUIRED_DOCUMENT_TYPES = [
  CustomerDocumentType.REGISTRATION_CERT,
  CustomerDocumentType.TAX_CLEARANCE,
];

@Injectable()
export class CustomerOnboardingService {
  constructor(
    @InjectRepository(CustomerOnboarding)
    private readonly onboardingRepo: Repository<CustomerOnboarding>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    @InjectRepository(CustomerDocument)
    private readonly documentRepo: Repository<CustomerDocument>,
    @InjectRepository(CustomerCompany)
    private readonly companyRepo: Repository<CustomerCompany>,
    private readonly auditService: AuditService,
  ) {}

  async getOnboardingStatus(customerId: number) {
    const onboarding = await this.onboardingRepo.findOne({
      where: { customerId },
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    // Get documents
    const documents = await this.documentRepo.find({
      where: { customerId },
    });

    // Check document completeness
    const uploadedTypes = documents.map(d => d.documentType);
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter(
      type => !uploadedTypes.includes(type),
    );

    // Get profile and company
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ['company'],
    });

    return {
      id: onboarding.id,
      status: onboarding.status,
      companyDetailsComplete: onboarding.companyDetailsComplete,
      documentsComplete: missingDocuments.length === 0,
      submittedAt: onboarding.submittedAt,
      reviewedAt: onboarding.reviewedAt,
      rejectionReason: onboarding.rejectionReason ?? undefined,
      remediationSteps: onboarding.remediationSteps ?? undefined,
      resubmissionCount: onboarding.resubmissionCount,
      checklist: {
        companyDetails: {
          complete: onboarding.companyDetailsComplete,
          items: this.getCompanyChecklist(profile?.company),
        },
        documents: {
          complete: missingDocuments.length === 0,
          required: REQUIRED_DOCUMENT_TYPES,
          uploaded: uploadedTypes,
          missing: missingDocuments,
          items: documents.map(d => ({
            id: d.id,
            type: d.documentType,
            fileName: d.fileName,
            validationStatus: d.validationStatus,
            uploadedAt: d.uploadedAt,
          })),
        },
      },
    };
  }

  private getCompanyChecklist(company: CustomerCompany | null | undefined) {
    if (!company) return [];

    return [
      { field: 'legalName', label: 'Legal Company Name', complete: !!company.legalName },
      { field: 'registrationNumber', label: 'Registration Number', complete: !!company.registrationNumber },
      { field: 'streetAddress', label: 'Street Address', complete: !!company.streetAddress },
      { field: 'city', label: 'City', complete: !!company.city },
      { field: 'primaryPhone', label: 'Primary Phone', complete: !!company.primaryPhone },
    ];
  }

  async updateCompanyDetails(customerId: number, data: Partial<CustomerCompany>, clientIp: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ['company'],
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    const onboarding = await this.onboardingRepo.findOne({
      where: { customerId },
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    // Only allow updates in DRAFT or REJECTED status
    if (![CustomerOnboardingStatus.DRAFT, CustomerOnboardingStatus.REJECTED].includes(onboarding.status)) {
      throw new ForbiddenException('Cannot update company details at this stage');
    }

    // Update company
    const company = profile.company;
    Object.assign(company, data);
    await this.companyRepo.save(company);

    // Check if company details are now complete
    const isComplete = !!(
      company.legalName &&
      company.registrationNumber &&
      company.streetAddress &&
      company.city &&
      company.primaryPhone
    );

    onboarding.companyDetailsComplete = isComplete;
    await this.onboardingRepo.save(onboarding);

    await this.auditService.log({
      entityType: 'customer_company',
      entityId: company.id,
      action: AuditAction.UPDATE,
      newValues: data,
      ipAddress: clientIp,
    });

    return { success: true, companyDetailsComplete: isComplete };
  }

  async submitOnboarding(customerId: number, clientIp: string) {
    const onboarding = await this.onboardingRepo.findOne({
      where: { customerId },
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    // Only allow submission from DRAFT or REJECTED status
    if (![CustomerOnboardingStatus.DRAFT, CustomerOnboardingStatus.REJECTED].includes(onboarding.status)) {
      throw new BadRequestException('Onboarding has already been submitted');
    }

    // Check company details complete
    if (!onboarding.companyDetailsComplete) {
      throw new BadRequestException('Please complete all company details before submitting');
    }

    // Check documents complete
    const documents = await this.documentRepo.find({
      where: { customerId },
    });
    const uploadedTypes = documents.map(d => d.documentType);
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter(
      type => !uploadedTypes.includes(type),
    );

    if (missingDocuments.length > 0) {
      throw new BadRequestException(`Missing required documents: ${missingDocuments.join(', ')}`);
    }

    // Update status
    const previousStatus = onboarding.status;
    onboarding.status = CustomerOnboardingStatus.SUBMITTED;
    onboarding.submittedAt = new Date();
    onboarding.documentsComplete = true;

    if (previousStatus === CustomerOnboardingStatus.REJECTED) {
      onboarding.resubmissionCount += 1;
      onboarding.rejectionReason = null;
      onboarding.remediationSteps = null;
    }

    await this.onboardingRepo.save(onboarding);

    await this.auditService.log({
      entityType: 'customer_onboarding',
      entityId: onboarding.id,
      action: AuditAction.UPDATE,
      newValues: { status: CustomerOnboardingStatus.SUBMITTED, submittedAt: onboarding.submittedAt },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Onboarding submitted successfully. It will be reviewed shortly.',
      status: onboarding.status,
    };
  }

  async saveDraft(customerId: number, data: Partial<CustomerCompany>, clientIp: string) {
    return this.updateCompanyDetails(customerId, data, clientIp);
  }
}
