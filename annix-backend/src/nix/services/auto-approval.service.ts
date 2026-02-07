import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import {
  CustomerDocument,
  CustomerDocumentType,
  CustomerDocumentValidationStatus,
} from "../../customer/entities/customer-document.entity";
import {
  CustomerOnboarding,
  CustomerOnboardingStatus,
} from "../../customer/entities/customer-onboarding.entity";
import {
  CustomerAccountStatus,
  CustomerProfile,
} from "../../customer/entities/customer-profile.entity";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import {
  SupplierDocument,
  SupplierDocumentType,
  SupplierDocumentValidationStatus,
} from "../../supplier/entities/supplier-document.entity";
import {
  SupplierOnboarding,
  SupplierOnboardingStatus,
} from "../../supplier/entities/supplier-onboarding.entity";
import {
  SupplierAccountStatus,
  SupplierProfile,
} from "../../supplier/entities/supplier-profile.entity";

const REQUIRED_CUSTOMER_DOCUMENT_TYPES = [
  CustomerDocumentType.REGISTRATION_CERT,
  CustomerDocumentType.VAT_CERT,
  CustomerDocumentType.BEE_CERT,
];

const REQUIRED_SUPPLIER_DOCUMENT_TYPES = [
  SupplierDocumentType.REGISTRATION_CERT,
  SupplierDocumentType.VAT_CERT,
  SupplierDocumentType.BEE_CERT,
  SupplierDocumentType.TAX_CLEARANCE,
];

export interface AutoApprovalResult {
  entityType: "customer" | "supplier";
  entityId: number;
  approved: boolean;
  reason: string;
  missingDocuments: string[];
  invalidDocuments: string[];
  manualReviewDocuments: string[];
}

@Injectable()
export class AutoApprovalService {
  private readonly logger = new Logger(AutoApprovalService.name);

  constructor(
    @InjectRepository(CustomerDocument)
    private readonly customerDocumentRepo: Repository<CustomerDocument>,
    @InjectRepository(CustomerOnboarding)
    private readonly customerOnboardingRepo: Repository<CustomerOnboarding>,
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepo: Repository<CustomerProfile>,
    @InjectRepository(SupplierDocument)
    private readonly supplierDocumentRepo: Repository<SupplierDocument>,
    @InjectRepository(SupplierOnboarding)
    private readonly supplierOnboardingRepo: Repository<SupplierOnboarding>,
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepo: Repository<SupplierProfile>,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async checkAndAutoApprove(
    entityType: "customer" | "supplier",
    entityId: number,
  ): Promise<AutoApprovalResult> {
    if (entityType === "customer") {
      return this.checkAndAutoApproveCustomer(entityId);
    } else {
      return this.checkAndAutoApproveSupplier(entityId);
    }
  }

  private async checkAndAutoApproveCustomer(customerId: number): Promise<AutoApprovalResult> {
    const onboarding = await this.customerOnboardingRepo.findOne({
      where: { customerId },
      relations: ["customer", "customer.company", "customer.user"],
    });

    if (!onboarding) {
      return {
        entityType: "customer",
        entityId: customerId,
        approved: false,
        reason: "Onboarding record not found",
        missingDocuments: [],
        invalidDocuments: [],
        manualReviewDocuments: [],
      };
    }

    if (
      ![CustomerOnboardingStatus.SUBMITTED, CustomerOnboardingStatus.UNDER_REVIEW].includes(
        onboarding.status,
      )
    ) {
      return {
        entityType: "customer",
        entityId: customerId,
        approved: false,
        reason: `Onboarding not in reviewable state (current: ${onboarding.status})`,
        missingDocuments: [],
        invalidDocuments: [],
        manualReviewDocuments: [],
      };
    }

    const documents = await this.customerDocumentRepo.find({
      where: { customerId },
    });

    const validationResult = this.validateCustomerDocuments(documents);

    if (validationResult.canAutoApprove) {
      await this.approveCustomerOnboarding(onboarding);
      this.logger.log(`Auto-approved customer onboarding for customerId=${customerId}`);

      return {
        entityType: "customer",
        entityId: customerId,
        approved: true,
        reason: "All documents verified successfully",
        missingDocuments: [],
        invalidDocuments: [],
        manualReviewDocuments: [],
      };
    }

    if (validationResult.manualReviewDocuments.length > 0) {
      await this.flagCustomerForManualReview(onboarding);
      this.logger.log(`Flagged customer for manual review: customerId=${customerId}`);
    }

    return {
      entityType: "customer",
      entityId: customerId,
      approved: false,
      reason: validationResult.reason,
      missingDocuments: validationResult.missingDocuments,
      invalidDocuments: validationResult.invalidDocuments,
      manualReviewDocuments: validationResult.manualReviewDocuments,
    };
  }

  private async checkAndAutoApproveSupplier(supplierId: number): Promise<AutoApprovalResult> {
    const onboarding = await this.supplierOnboardingRepo.findOne({
      where: { supplierId },
      relations: ["supplier", "supplier.company", "supplier.user"],
    });

    if (!onboarding) {
      return {
        entityType: "supplier",
        entityId: supplierId,
        approved: false,
        reason: "Onboarding record not found",
        missingDocuments: [],
        invalidDocuments: [],
        manualReviewDocuments: [],
      };
    }

    if (
      ![SupplierOnboardingStatus.SUBMITTED, SupplierOnboardingStatus.UNDER_REVIEW].includes(
        onboarding.status,
      )
    ) {
      return {
        entityType: "supplier",
        entityId: supplierId,
        approved: false,
        reason: `Onboarding not in reviewable state (current: ${onboarding.status})`,
        missingDocuments: [],
        invalidDocuments: [],
        manualReviewDocuments: [],
      };
    }

    const documents = await this.supplierDocumentRepo.find({
      where: { supplierId },
    });

    const validationResult = this.validateSupplierDocuments(documents);

    if (validationResult.canAutoApprove) {
      await this.approveSupplierOnboarding(onboarding);
      this.logger.log(`Auto-approved supplier onboarding for supplierId=${supplierId}`);

      return {
        entityType: "supplier",
        entityId: supplierId,
        approved: true,
        reason: "All documents verified successfully",
        missingDocuments: [],
        invalidDocuments: [],
        manualReviewDocuments: [],
      };
    }

    if (validationResult.manualReviewDocuments.length > 0) {
      await this.flagSupplierForManualReview(onboarding);
      this.logger.log(`Flagged supplier for manual review: supplierId=${supplierId}`);
    }

    return {
      entityType: "supplier",
      entityId: supplierId,
      approved: false,
      reason: validationResult.reason,
      missingDocuments: validationResult.missingDocuments,
      invalidDocuments: validationResult.invalidDocuments,
      manualReviewDocuments: validationResult.manualReviewDocuments,
    };
  }

  private validateCustomerDocuments(documents: CustomerDocument[]): {
    canAutoApprove: boolean;
    reason: string;
    missingDocuments: string[];
    invalidDocuments: string[];
    manualReviewDocuments: string[];
  } {
    const missingDocuments: string[] = [];
    const invalidDocuments: string[] = [];
    const manualReviewDocuments: string[] = [];

    for (const requiredType of REQUIRED_CUSTOMER_DOCUMENT_TYPES) {
      const doc = documents.find((d) => d.documentType === requiredType);

      if (!doc) {
        missingDocuments.push(requiredType);
      } else if (doc.validationStatus === CustomerDocumentValidationStatus.VALID) {
      } else if (doc.validationStatus === CustomerDocumentValidationStatus.INVALID) {
        invalidDocuments.push(requiredType);
      } else if (doc.validationStatus === CustomerDocumentValidationStatus.FAILED) {
        invalidDocuments.push(requiredType);
      } else if (doc.validationStatus === CustomerDocumentValidationStatus.MANUAL_REVIEW) {
        manualReviewDocuments.push(requiredType);
      } else if (doc.validationStatus === CustomerDocumentValidationStatus.PENDING) {
        manualReviewDocuments.push(requiredType);
      }
    }

    const canAutoApprove =
      missingDocuments.length === 0 &&
      invalidDocuments.length === 0 &&
      manualReviewDocuments.length === 0;

    let reason = "All documents verified successfully";
    if (missingDocuments.length > 0) {
      reason = `Missing required documents: ${missingDocuments.join(", ")}`;
    } else if (invalidDocuments.length > 0) {
      reason = `Invalid documents: ${invalidDocuments.join(", ")}`;
    } else if (manualReviewDocuments.length > 0) {
      reason = `Documents require manual review: ${manualReviewDocuments.join(", ")}`;
    }

    return { canAutoApprove, reason, missingDocuments, invalidDocuments, manualReviewDocuments };
  }

  private validateSupplierDocuments(documents: SupplierDocument[]): {
    canAutoApprove: boolean;
    reason: string;
    missingDocuments: string[];
    invalidDocuments: string[];
    manualReviewDocuments: string[];
  } {
    const missingDocuments: string[] = [];
    const invalidDocuments: string[] = [];
    const manualReviewDocuments: string[] = [];

    for (const requiredType of REQUIRED_SUPPLIER_DOCUMENT_TYPES) {
      const doc = documents.find((d) => d.documentType === requiredType);

      if (!doc) {
        missingDocuments.push(requiredType);
      } else if (doc.validationStatus === SupplierDocumentValidationStatus.VALID) {
      } else if (doc.validationStatus === SupplierDocumentValidationStatus.INVALID) {
        invalidDocuments.push(requiredType);
      } else if (doc.validationStatus === SupplierDocumentValidationStatus.FAILED) {
        invalidDocuments.push(requiredType);
      } else if (doc.validationStatus === SupplierDocumentValidationStatus.MANUAL_REVIEW) {
        manualReviewDocuments.push(requiredType);
      } else if (doc.validationStatus === SupplierDocumentValidationStatus.PENDING) {
        manualReviewDocuments.push(requiredType);
      }
    }

    const canAutoApprove =
      missingDocuments.length === 0 &&
      invalidDocuments.length === 0 &&
      manualReviewDocuments.length === 0;

    let reason = "All documents verified successfully";
    if (missingDocuments.length > 0) {
      reason = `Missing required documents: ${missingDocuments.join(", ")}`;
    } else if (invalidDocuments.length > 0) {
      reason = `Invalid documents: ${invalidDocuments.join(", ")}`;
    } else if (manualReviewDocuments.length > 0) {
      reason = `Documents require manual review: ${manualReviewDocuments.join(", ")}`;
    }

    return { canAutoApprove, reason, missingDocuments, invalidDocuments, manualReviewDocuments };
  }

  private async approveCustomerOnboarding(onboarding: CustomerOnboarding): Promise<void> {
    onboarding.status = CustomerOnboardingStatus.APPROVED;
    onboarding.reviewedAt = now().toJSDate();
    onboarding.reviewedById = null;
    await this.customerOnboardingRepo.save(onboarding);

    const profile = onboarding.customer;
    profile.accountStatus = CustomerAccountStatus.ACTIVE;
    await this.customerProfileRepo.save(profile);

    await this.customerDocumentRepo.update(
      {
        customerId: onboarding.customerId,
        validationStatus: CustomerDocumentValidationStatus.VALID,
      },
      { reviewedAt: now().toJSDate() },
    );

    await this.emailService.sendCustomerOnboardingApprovalEmail(
      profile.user.email,
      profile.company.tradingName || profile.company.legalName,
    );

    await this.auditService.log({
      entityType: "customer_onboarding",
      entityId: onboarding.id,
      action: AuditAction.APPROVE,
      newValues: {
        status: CustomerOnboardingStatus.APPROVED,
        customerId: onboarding.customerId,
        autoApproved: true,
      },
      ipAddress: "system",
    });
  }

  private async approveSupplierOnboarding(onboarding: SupplierOnboarding): Promise<void> {
    onboarding.status = SupplierOnboardingStatus.APPROVED;
    onboarding.reviewedAt = now().toJSDate();
    onboarding.reviewedById = null;
    await this.supplierOnboardingRepo.save(onboarding);

    const profile = onboarding.supplier;
    profile.accountStatus = SupplierAccountStatus.ACTIVE;
    await this.supplierProfileRepo.save(profile);

    await this.supplierDocumentRepo.update(
      {
        supplierId: onboarding.supplierId,
        validationStatus: SupplierDocumentValidationStatus.VALID,
      },
      { reviewedAt: now().toJSDate() },
    );

    await this.emailService.sendSupplierApprovalEmail(
      profile.user.email,
      profile.company.tradingName || profile.company.legalName,
    );

    await this.auditService.log({
      entityType: "supplier_onboarding",
      entityId: onboarding.id,
      action: AuditAction.APPROVE,
      newValues: {
        status: SupplierOnboardingStatus.APPROVED,
        supplierId: onboarding.supplierId,
        autoApproved: true,
      },
      ipAddress: "system",
    });
  }

  private async flagCustomerForManualReview(onboarding: CustomerOnboarding): Promise<void> {
    if (onboarding.status !== CustomerOnboardingStatus.UNDER_REVIEW) {
      onboarding.status = CustomerOnboardingStatus.UNDER_REVIEW;
      await this.customerOnboardingRepo.save(onboarding);
    }

    await this.emailService.sendManualReviewNotification(
      onboarding.customer.company.tradingName || onboarding.customer.company.legalName,
      onboarding.customer.user.email,
      onboarding.customerId,
      "multiple documents",
      "Documents require manual review due to verification discrepancies",
    );
  }

  private async flagSupplierForManualReview(onboarding: SupplierOnboarding): Promise<void> {
    if (onboarding.status !== SupplierOnboardingStatus.UNDER_REVIEW) {
      onboarding.status = SupplierOnboardingStatus.UNDER_REVIEW;
      await this.supplierOnboardingRepo.save(onboarding);
    }

    await this.emailService.sendSupplierManualReviewNotification(
      onboarding.supplier.company.tradingName || onboarding.supplier.company.legalName,
      onboarding.supplier.user.email,
      onboarding.supplierId,
      "multiple documents",
      "Documents require manual review due to verification discrepancies",
    );
  }
}
