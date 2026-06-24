import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { now } from "../lib/datetime";
import { Address, ContactDetails } from "../lib/value-objects";
import { CompanyRepository } from "../platform/company.repository";
import { Company } from "../platform/entities/company.entity";

type CompanyDetailsInput = Partial<
  Omit<Company, "address" | "contact"> & {
    streetAddress: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
  }
>;

import { CustomerDocumentRepository } from "./customer-document.repository";
import { CustomerOnboardingRepository } from "./customer-onboarding.repository";
import { CustomerProfileRepository } from "./customer-profile.repository";
import { CustomerDocumentType } from "./entities/customer-document.entity";
import { CustomerOnboardingStatus } from "./entities/customer-onboarding.entity";

// Required document types for onboarding
const REQUIRED_DOCUMENT_TYPES = [
  CustomerDocumentType.REGISTRATION_CERT,
  CustomerDocumentType.TAX_CLEARANCE,
];

@Injectable()
export class CustomerOnboardingService {
  constructor(
    private readonly onboardingRepository: CustomerOnboardingRepository,
    private readonly profileRepository: CustomerProfileRepository,
    private readonly documentRepository: CustomerDocumentRepository,
    private readonly companyRepo: CompanyRepository,
    private readonly auditService: AuditService,
  ) {}

  async getOnboardingStatus(customerId: number) {
    const onboarding = await this.onboardingRepository.findByCustomerId(customerId);

    if (!onboarding) {
      throw new NotFoundException("Onboarding record not found");
    }

    // Get documents
    const documents = await this.documentRepository.findManyWhere({ customerId });

    // Check document completeness
    const uploadedTypes = documents.map((d) => d.documentType);
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter(
      (type) => !uploadedTypes.includes(type),
    );

    // Get profile and company
    const profile = await this.profileRepository.findById(customerId, ["company"]);

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
          items: documents.map((d) => ({
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

  private getCompanyChecklist(company: Company | null | undefined) {
    if (!company) return [];

    return [
      {
        field: "legalName",
        label: "Legal Company Name",
        complete: !!company.legalName,
      },
      {
        field: "registrationNumber",
        label: "Registration Number",
        complete: !!company.registrationNumber,
      },
      {
        field: "streetAddress",
        label: "Street Address",
        complete: !!company.address?.streetAddress,
      },
      { field: "city", label: "City", complete: !!company.address?.city },
      {
        field: "primaryPhone",
        label: "Primary Phone",
        complete: !!company.contact?.phone,
      },
    ];
  }

  async updateCompanyDetails(customerId: number, data: CompanyDetailsInput, clientIp: string) {
    const profile = await this.profileRepository.findById(customerId, ["company"]);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const onboarding = await this.onboardingRepository.findByCustomerId(customerId);

    if (!onboarding) {
      throw new NotFoundException("Onboarding record not found");
    }

    // Only allow updates in DRAFT or REJECTED status
    if (
      ![CustomerOnboardingStatus.DRAFT, CustomerOnboardingStatus.REJECTED].includes(
        onboarding.status,
      )
    ) {
      throw new ForbiddenException("Cannot update company details at this stage");
    }

    // Update company
    const company = profile.company;
    const { streetAddress, city, province, postalCode, phone, email, ...rest } = data;
    Object.assign(company, rest);
    if (
      streetAddress !== undefined ||
      city !== undefined ||
      province !== undefined ||
      postalCode !== undefined
    ) {
      company.address = Address.fromParts({
        streetAddress: streetAddress ?? company.address?.streetAddress,
        city: city ?? company.address?.city,
        province: province ?? company.address?.province,
        postalCode: postalCode ?? company.address?.postalCode,
      });
    }
    if (phone !== undefined || email !== undefined) {
      company.contact = ContactDetails.fromParts({
        phone: phone ?? company.contact?.phone,
        email: email ?? company.contact?.email,
      });
    }
    await this.companyRepo.save(company);

    // Check if company details are now complete
    const isComplete = !!(
      company.legalName &&
      company.registrationNumber &&
      company.address?.streetAddress &&
      company.address?.city &&
      company.contact?.phone
    );

    onboarding.companyDetailsComplete = isComplete;
    await this.onboardingRepository.save(onboarding);

    await this.auditService.log({
      entityType: "customer_company",
      entityId: company.id,
      action: AuditAction.UPDATE,
      newValues: data,
      ipAddress: clientIp,
    });

    return { success: true, companyDetailsComplete: isComplete };
  }

  async submitOnboarding(customerId: number, clientIp: string) {
    const onboarding = await this.onboardingRepository.findByCustomerId(customerId);

    if (!onboarding) {
      throw new NotFoundException("Onboarding record not found");
    }

    // Only allow submission from DRAFT or REJECTED status
    if (
      ![CustomerOnboardingStatus.DRAFT, CustomerOnboardingStatus.REJECTED].includes(
        onboarding.status,
      )
    ) {
      throw new BadRequestException("Onboarding has already been submitted");
    }

    // Check company details complete
    if (!onboarding.companyDetailsComplete) {
      throw new BadRequestException("Please complete all company details before submitting");
    }

    // Check documents complete
    const documents = await this.documentRepository.findManyWhere({ customerId });
    const uploadedTypes = documents.map((d) => d.documentType);
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter(
      (type) => !uploadedTypes.includes(type),
    );

    if (missingDocuments.length > 0) {
      throw new BadRequestException(`Missing required documents: ${missingDocuments.join(", ")}`);
    }

    // Update status
    const previousStatus = onboarding.status;
    onboarding.status = CustomerOnboardingStatus.SUBMITTED;
    onboarding.submittedAt = now().toJSDate();
    onboarding.documentsComplete = true;

    if (previousStatus === CustomerOnboardingStatus.REJECTED) {
      onboarding.resubmissionCount += 1;
      onboarding.rejectionReason = null;
      onboarding.remediationSteps = null;
    }

    await this.onboardingRepository.save(onboarding);

    await this.auditService.log({
      entityType: "customer_onboarding",
      entityId: onboarding.id,
      action: AuditAction.UPDATE,
      newValues: {
        status: CustomerOnboardingStatus.SUBMITTED,
        submittedAt: onboarding.submittedAt,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: "Onboarding submitted successfully. It will be reviewed shortly.",
      status: onboarding.status,
    };
  }

  async saveDraft(customerId: number, data: CompanyDetailsInput, clientIp: string) {
    return this.updateCompanyDetails(customerId, data, clientIp);
  }
}
