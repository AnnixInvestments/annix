import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Boq, BoqStatus } from './entities/boq.entity';
import { BoqSection } from './entities/boq-section.entity';
import {
  BoqSupplierAccess,
  SupplierBoqStatus,
} from './entities/boq-supplier-access.entity';
import { SupplierProfile, SupplierAccountStatus } from '../supplier/entities/supplier-profile.entity';
import { SupplierCapability, ProductCategory } from '../supplier/entities/supplier-capability.entity';
import { SupplierOnboarding, SupplierOnboardingStatus } from '../supplier/entities/supplier-onboarding.entity';
import { EmailService } from '../email/email.service';
import {
  BOQ_SECTION_TO_CAPABILITY,
  CAPABILITY_TO_SECTIONS,
  getSectionTitle,
  getSectionsForCapabilities,
} from './config/capability-mapping';

// Types for consolidated BOQ data from frontend
export interface ConsolidatedItem {
  description: string;
  qty: number;
  unit: string;
  weightKg: number;
  entries: number[];
  welds?: {
    pipeWeld?: number;
    flangeWeld?: number;
    mitreWeld?: number;
    teeWeld?: number;
  };
  areas?: {
    intAreaM2?: number;
    extAreaM2?: number;
  };
}

export interface ConsolidatedBoqData {
  straightPipes?: ConsolidatedItem[];
  bends?: ConsolidatedItem[];
  tees?: ConsolidatedItem[];
  reducers?: ConsolidatedItem[];
  flanges?: ConsolidatedItem[];
  blankFlanges?: ConsolidatedItem[];
  bnwSets?: ConsolidatedItem[];
  gaskets?: ConsolidatedItem[];
  surfaceProtection?: ConsolidatedItem[];
  hdpePipes?: ConsolidatedItem[];
  pvcPipes?: ConsolidatedItem[];
  structuralSteel?: ConsolidatedItem[];
}

export interface SubmitBoqResult {
  boq: Boq;
  sectionsCreated: number;
  suppliersNotified: number;
  sectionsSummary: {
    sectionType: string;
    sectionTitle: string;
    itemCount: number;
    totalWeightKg: number;
  }[];
}

// Mapping from frontend data keys to section types
const DATA_KEY_TO_SECTION: Record<string, string> = {
  straightPipes: 'straight_pipes',
  bends: 'bends',
  tees: 'tees',
  reducers: 'reducers',
  flanges: 'flanges',
  blankFlanges: 'blank_flanges',
  bnwSets: 'bnw_sets',
  gaskets: 'gaskets',
  surfaceProtection: 'surface_protection',
  hdpePipes: 'hdpe_pipes',
  pvcPipes: 'pvc_pipes',
  structuralSteel: 'structural_steel',
};

// Mapping from ProductCategory enum to capability keys
const PRODUCT_CATEGORY_TO_CAPABILITY: Record<ProductCategory, string> = {
  [ProductCategory.STRAIGHT_PIPE]: 'fabricated_steel',
  [ProductCategory.BENDS]: 'fabricated_steel',
  [ProductCategory.FLANGES]: 'fabricated_steel',
  [ProductCategory.FITTINGS]: 'fabricated_steel',
  [ProductCategory.VALVES]: 'fabricated_steel',
  [ProductCategory.STRUCTURAL_STEEL]: 'structural_steel',
  [ProductCategory.HDPE]: 'hdpe',
  [ProductCategory.PVC]: 'pvc',
  [ProductCategory.FABRICATION]: 'fabricated_steel',
  [ProductCategory.COATING]: 'surface_protection',
  [ProductCategory.INSPECTION]: 'surface_protection',
  [ProductCategory.OTHER]: 'fabricated_steel',
};

@Injectable()
export class BoqDistributionService {
  private readonly logger = new Logger(BoqDistributionService.name);

  constructor(
    @InjectRepository(Boq)
    private boqRepository: Repository<Boq>,
    @InjectRepository(BoqSection)
    private sectionRepository: Repository<BoqSection>,
    @InjectRepository(BoqSupplierAccess)
    private accessRepository: Repository<BoqSupplierAccess>,
    @InjectRepository(SupplierProfile)
    private supplierProfileRepository: Repository<SupplierProfile>,
    @InjectRepository(SupplierCapability)
    private capabilityRepository: Repository<SupplierCapability>,
    @InjectRepository(SupplierOnboarding)
    private onboardingRepository: Repository<SupplierOnboarding>,
    private emailService: EmailService,
  ) {}

  /**
   * Submit a BOQ for quotation - generates sections, matches suppliers, and notifies them
   */
  async submitForQuotation(
    boqId: number,
    boqData: ConsolidatedBoqData,
    customerInfo?: {
      name: string;
      email: string;
      phone?: string;
      company?: string;
    },
    projectInfo?: {
      name: string;
      description?: string;
      requiredDate?: string;
    },
  ): Promise<SubmitBoqResult> {
    const boq = await this.boqRepository.findOne({
      where: { id: boqId },
      relations: ['rfq'],
    });

    if (!boq) {
      throw new NotFoundException(`BOQ with ID ${boqId} not found`);
    }

    this.logger.log(`Submitting BOQ ${boq.boqNumber} for quotation`);

    // 1. Generate BOQ sections from consolidated data
    const sections = await this.generateSections(boqId, boqData);
    this.logger.log(`Generated ${sections.length} sections for BOQ ${boq.boqNumber}`);

    // 2. Find matching suppliers for each section
    const supplierAccessRecords = await this.findAndCreateSupplierAccess(
      boqId,
      sections,
      customerInfo,
      projectInfo,
    );
    this.logger.log(`Created ${supplierAccessRecords.length} supplier access records`);

    // 3. Send notifications to suppliers
    const notifiedCount = await this.notifySuppliers(boq, supplierAccessRecords);
    this.logger.log(`Notified ${notifiedCount} suppliers`);

    // 4. Update BOQ status to SUBMITTED
    boq.status = BoqStatus.SUBMITTED;
    await this.boqRepository.save(boq);

    return {
      boq,
      sectionsCreated: sections.length,
      suppliersNotified: notifiedCount,
      sectionsSummary: sections.map((s) => ({
        sectionType: s.sectionType,
        sectionTitle: s.sectionTitle,
        itemCount: s.itemCount,
        totalWeightKg: Number(s.totalWeightKg) || 0,
      })),
    };
  }

  /**
   * Generate BoqSection records from consolidated BOQ data
   */
  async generateSections(
    boqId: number,
    boqData: ConsolidatedBoqData,
  ): Promise<BoqSection[]> {
    // Delete existing sections for this BOQ (in case of re-submission)
    await this.sectionRepository.delete({ boqId });

    const sections: BoqSection[] = [];

    for (const [dataKey, sectionType] of Object.entries(DATA_KEY_TO_SECTION)) {
      const items = boqData[dataKey as keyof ConsolidatedBoqData];

      if (items && Array.isArray(items) && items.length > 0) {
        const capabilityKey = BOQ_SECTION_TO_CAPABILITY[sectionType];

        if (!capabilityKey) {
          this.logger.warn(`No capability mapping for section type: ${sectionType}`);
          continue;
        }

        // Calculate total weight for section
        const totalWeightKg = items.reduce(
          (sum, item) => sum + (item.weightKg || 0),
          0,
        );

        const section = this.sectionRepository.create({
          boqId,
          sectionType,
          capabilityKey,
          sectionTitle: getSectionTitle(sectionType),
          items,
          totalWeightKg,
          itemCount: items.length,
        });

        sections.push(section);
      }
    }

    if (sections.length > 0) {
      await this.sectionRepository.save(sections);
    }

    return sections;
  }

  /**
   * Find approved suppliers with matching capabilities and create access records
   */
  async findAndCreateSupplierAccess(
    boqId: number,
    sections: BoqSection[],
    customerInfo?: {
      name: string;
      email: string;
      phone?: string;
      company?: string;
    },
    projectInfo?: {
      name: string;
      description?: string;
      requiredDate?: string;
    },
  ): Promise<BoqSupplierAccess[]> {
    // Delete existing access records for this BOQ (in case of re-submission)
    await this.accessRepository.delete({ boqId });

    // Get unique capability keys needed
    const requiredCapabilities = [...new Set(sections.map((s) => s.capabilityKey))];
    this.logger.log(`Required capabilities: ${requiredCapabilities.join(', ')}`);

    // Find approved suppliers
    const approvedOnboardings = await this.onboardingRepository.find({
      where: { status: SupplierOnboardingStatus.APPROVED },
      relations: ['supplier'],
    });

    const approvedSupplierIds = approvedOnboardings
      .filter((o) => o.supplier?.accountStatus === SupplierAccountStatus.ACTIVE)
      .map((o) => o.supplierId);

    if (approvedSupplierIds.length === 0) {
      this.logger.warn('No approved suppliers found');
      return [];
    }

    // Get capabilities for approved suppliers
    const capabilities = await this.capabilityRepository.find({
      where: {
        supplierProfileId: In(approvedSupplierIds),
        isActive: true,
      },
      relations: ['supplierProfile', 'supplierProfile.user', 'supplierProfile.company'],
    });

    // Map suppliers to their capability keys
    const supplierCapabilities = new Map<number, Set<string>>();

    for (const cap of capabilities) {
      const capabilityKey = PRODUCT_CATEGORY_TO_CAPABILITY[cap.productCategory];
      if (!capabilityKey) continue;

      if (!supplierCapabilities.has(cap.supplierProfileId)) {
        supplierCapabilities.set(cap.supplierProfileId, new Set());
      }
      supplierCapabilities.get(cap.supplierProfileId)!.add(capabilityKey);
    }

    // Create access records for matching suppliers
    const accessRecords: BoqSupplierAccess[] = [];

    for (const [supplierProfileId, capabilityKeys] of supplierCapabilities) {
      // Find which sections this supplier can access
      const allowedSections = sections
        .filter((s) => capabilityKeys.has(s.capabilityKey))
        .map((s) => s.sectionType);

      if (allowedSections.length === 0) continue;

      const access = this.accessRepository.create({
        boqId,
        supplierProfileId,
        allowedSections,
        status: SupplierBoqStatus.PENDING,
        customerInfo,
        projectInfo,
      });

      accessRecords.push(access);
    }

    if (accessRecords.length > 0) {
      await this.accessRepository.save(accessRecords);
    }

    return accessRecords;
  }

  /**
   * Send email notifications to suppliers
   */
  async notifySuppliers(
    boq: Boq,
    accessRecords: BoqSupplierAccess[],
  ): Promise<number> {
    let notifiedCount = 0;

    for (const access of accessRecords) {
      try {
        // Load supplier profile with relations if not already loaded
        const supplierProfile = await this.supplierProfileRepository.findOne({
          where: { id: access.supplierProfileId },
          relations: ['user', 'company'],
        });

        if (!supplierProfile?.user?.email) {
          this.logger.warn(
            `Supplier profile ${access.supplierProfileId} has no email`,
          );
          continue;
        }

        // Get section titles for this supplier
        const sectionTitles = access.allowedSections.map((s) => getSectionTitle(s));

        const success = await this.emailService.sendSupplierBoqNotification(
          supplierProfile.user.email,
          supplierProfile.company?.tradingName || supplierProfile.company?.legalName ||
            `${supplierProfile.firstName} ${supplierProfile.lastName}`,
          access.projectInfo?.name || boq.title || 'New Project',
          boq.boqNumber,
          sectionTitles,
          access.customerInfo,
        );

        if (success) {
          // Update notification sent timestamp
          access.notificationSentAt = new Date();
          await this.accessRepository.save(access);
          notifiedCount++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to notify supplier ${access.supplierProfileId}:`,
          error,
        );
      }
    }

    return notifiedCount;
  }

  /**
   * Get filtered BOQ for a specific supplier (only their allowed sections)
   */
  async getFilteredBoqForSupplier(
    boqId: number,
    supplierProfileId: number,
  ): Promise<{
    boq: Boq;
    sections: BoqSection[];
    access: BoqSupplierAccess;
  }> {
    const access = await this.accessRepository.findOne({
      where: { boqId, supplierProfileId },
    });

    if (!access) {
      throw new NotFoundException(
        `Supplier ${supplierProfileId} does not have access to BOQ ${boqId}`,
      );
    }

    const boq = await this.boqRepository.findOne({
      where: { id: boqId },
      relations: ['rfq'],
    });

    if (!boq) {
      throw new NotFoundException(`BOQ with ID ${boqId} not found`);
    }

    // Get only allowed sections
    const sections = await this.sectionRepository.find({
      where: {
        boqId,
        sectionType: In(access.allowedSections),
      },
      order: { id: 'ASC' },
    });

    return { boq, sections, access };
  }

  /**
   * Mark BOQ as viewed by supplier
   */
  async markAsViewed(boqId: number, supplierProfileId: number): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findOne({
      where: { boqId, supplierProfileId },
    });

    if (!access) {
      throw new NotFoundException(
        `Supplier ${supplierProfileId} does not have access to BOQ ${boqId}`,
      );
    }

    if (!access.viewedAt) {
      access.viewedAt = new Date();
      access.status = SupplierBoqStatus.VIEWED;
      await this.accessRepository.save(access);
    }

    return access;
  }

  /**
   * Decline to quote on a BOQ
   */
  async declineBoq(
    boqId: number,
    supplierProfileId: number,
    reason: string,
  ): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findOne({
      where: { boqId, supplierProfileId },
    });

    if (!access) {
      throw new NotFoundException(
        `Supplier ${supplierProfileId} does not have access to BOQ ${boqId}`,
      );
    }

    access.status = SupplierBoqStatus.DECLINED;
    access.declineReason = reason;
    access.respondedAt = new Date();

    await this.accessRepository.save(access);
    return access;
  }

  /**
   * Get all BOQs assigned to a supplier
   */
  async getSupplierBoqs(
    supplierProfileId: number,
    status?: SupplierBoqStatus,
  ): Promise<
    {
      access: BoqSupplierAccess;
      boq: Boq;
      sectionSummary: { type: string; title: string; itemCount: number }[];
    }[]
  > {
    const whereCondition: any = { supplierProfileId };
    if (status) {
      whereCondition.status = status;
    }

    const accessRecords = await this.accessRepository.find({
      where: whereCondition,
      relations: ['boq'],
      order: { createdAt: 'DESC' },
    });

    const results: {
      access: BoqSupplierAccess;
      boq: Boq;
      sectionSummary: { type: string; title: string; itemCount: number }[];
    }[] = [];

    for (const access of accessRecords) {
      // Get section summaries for allowed sections
      const sections = await this.sectionRepository.find({
        where: {
          boqId: access.boqId,
          sectionType: In(access.allowedSections),
        },
      });

      const sectionSummary = sections.map((s) => ({
        type: s.sectionType,
        title: s.sectionTitle,
        itemCount: s.itemCount,
      }));

      results.push({
        access,
        boq: access.boq,
        sectionSummary,
      });
    }

    return results;
  }

  /**
   * Handle BOQ update - re-notify suppliers
   */
  async handleBoqUpdate(
    boqId: number,
    boqData: ConsolidatedBoqData,
    customerInfo?: {
      name: string;
      email: string;
      phone?: string;
      company?: string;
    },
    projectInfo?: {
      name: string;
      description?: string;
      requiredDate?: string;
    },
  ): Promise<SubmitBoqResult> {
    const boq = await this.boqRepository.findOne({
      where: { id: boqId },
      relations: ['rfq'],
    });

    if (!boq) {
      throw new NotFoundException(`BOQ with ID ${boqId} not found`);
    }

    this.logger.log(`Updating BOQ ${boq.boqNumber}`);

    // Re-generate sections
    const sections = await this.generateSections(boqId, boqData);

    // Find and update supplier access (keeping existing records where possible)
    const existingAccess = await this.accessRepository.find({
      where: { boqId },
    });

    // Re-create access based on new sections
    const newAccessRecords = await this.findAndCreateSupplierAccess(
      boqId,
      sections,
      customerInfo,
      projectInfo,
    );

    // Send update notifications
    const notifiedCount = await this.sendUpdateNotifications(boq, newAccessRecords);

    return {
      boq,
      sectionsCreated: sections.length,
      suppliersNotified: notifiedCount,
      sectionsSummary: sections.map((s) => ({
        sectionType: s.sectionType,
        sectionTitle: s.sectionTitle,
        itemCount: s.itemCount,
        totalWeightKg: Number(s.totalWeightKg) || 0,
      })),
    };
  }

  /**
   * Send BOQ update notifications to suppliers
   */
  private async sendUpdateNotifications(
    boq: Boq,
    accessRecords: BoqSupplierAccess[],
  ): Promise<number> {
    let notifiedCount = 0;

    for (const access of accessRecords) {
      try {
        const supplierProfile = await this.supplierProfileRepository.findOne({
          where: { id: access.supplierProfileId },
          relations: ['user', 'company'],
        });

        if (!supplierProfile?.user?.email) continue;

        const sectionTitles = access.allowedSections.map((s) => getSectionTitle(s));

        const success = await this.emailService.sendBoqUpdateNotification(
          supplierProfile.user.email,
          supplierProfile.company?.tradingName || supplierProfile.company?.legalName ||
            `${supplierProfile.firstName} ${supplierProfile.lastName}`,
          access.projectInfo?.name || boq.title || 'Project',
          boq.boqNumber,
          sectionTitles,
        );

        if (success) {
          notifiedCount++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to send update notification to supplier ${access.supplierProfileId}:`,
          error,
        );
      }
    }

    return notifiedCount;
  }
}
