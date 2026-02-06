import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { now } from '../lib/datetime';
import { Boq, BoqStatus } from './entities/boq.entity';
import { BoqSection } from './entities/boq-section.entity';
import {
  BoqSupplierAccess,
  SupplierBoqStatus,
} from './entities/boq-supplier-access.entity';
import {
  SupplierProfile,
  SupplierAccountStatus,
} from '../supplier/entities/supplier-profile.entity';
import {
  SupplierCapability,
  ProductCategory,
} from '../supplier/entities/supplier-capability.entity';
import {
  SupplierOnboarding,
  SupplierOnboardingStatus,
} from '../supplier/entities/supplier-onboarding.entity';
import { EmailService } from '../email/email.service';
import { RfqItem } from '../rfq/entities/rfq-item.entity';
import { FlangeStandard } from '../flange-standard/entities/flange-standard.entity';
import { FlangePressureClass } from '../flange-pressure-class/entities/flange-pressure-class.entity';
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
  // Legacy values
  [ProductCategory.STRAIGHT_PIPE]: 'fabricated_steel',
  [ProductCategory.BENDS]: 'fabricated_steel',
  [ProductCategory.FLANGES]: 'fabricated_steel',
  [ProductCategory.FITTINGS]: 'fabricated_steel',
  [ProductCategory.VALVES]: 'fabricated_steel',
  [ProductCategory.FABRICATION]: 'fabricated_steel',
  [ProductCategory.COATING]: 'surface_protection',
  [ProductCategory.INSPECTION]: 'surface_protection',
  [ProductCategory.OTHER]: 'fabricated_steel',
  // New unified values (self-referencing since they are the capability keys)
  [ProductCategory.FABRICATED_STEEL]: 'fabricated_steel',
  [ProductCategory.FASTENERS_GASKETS]: 'fasteners_gaskets',
  [ProductCategory.SURFACE_PROTECTION]: 'surface_protection',
  [ProductCategory.HDPE]: 'hdpe',
  [ProductCategory.PVC]: 'pvc',
  [ProductCategory.STRUCTURAL_STEEL]: 'structural_steel',
  [ProductCategory.TRANSPORT_INSTALL]: 'transport_install',
  [ProductCategory.VALVES_INSTRUMENTS]: 'valves_meters_instruments',
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
    @InjectRepository(RfqItem)
    private rfqItemRepository: Repository<RfqItem>,
    @InjectRepository(FlangeStandard)
    private flangeStandardRepository: Repository<FlangeStandard>,
    @InjectRepository(FlangePressureClass)
    private flangePressureClassRepository: Repository<FlangePressureClass>,
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
    this.logger.log(
      `Generated ${sections.length} sections for BOQ ${boq.boqNumber}`,
    );

    // 2. Find matching suppliers for each section
    const supplierAccessRecords = await this.findAndCreateSupplierAccess(
      boqId,
      sections,
      customerInfo,
      projectInfo,
    );
    this.logger.log(
      `Created ${supplierAccessRecords.length} supplier access records`,
    );

    // 3. Send notifications to suppliers
    const notifiedCount = await this.notifySuppliers(
      boq,
      supplierAccessRecords,
    );
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
          this.logger.warn(
            `No capability mapping for section type: ${sectionType}`,
          );
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
    const requiredCapabilities = [
      ...new Set(sections.map((s) => s.capabilityKey)),
    ];
    this.logger.log(
      `Required capabilities: ${requiredCapabilities.join(', ')}`,
    );

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
      relations: [
        'supplierProfile',
        'supplierProfile.user',
        'supplierProfile.company',
      ],
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
    if (accessRecords.length === 0) {
      return 0;
    }

    const supplierProfileIds = [
      ...new Set(accessRecords.map((access) => access.supplierProfileId)),
    ];

    const supplierProfiles = await this.supplierProfileRepository.find({
      where: { id: In(supplierProfileIds) },
      relations: ['user', 'company'],
    });

    const supplierProfileMap = new Map(
      supplierProfiles.map((profile) => [profile.id, profile]),
    );

    let notifiedCount = 0;
    const accessesToUpdate: BoqSupplierAccess[] = [];

    for (const access of accessRecords) {
      try {
        const supplierProfile = supplierProfileMap.get(
          access.supplierProfileId,
        );

        if (!supplierProfile?.user?.email) {
          this.logger.warn(
            `Supplier profile ${access.supplierProfileId} has no email`,
          );
          continue;
        }

        const sectionTitles = access.allowedSections.map((s) =>
          getSectionTitle(s),
        );

        const success = await this.emailService.sendSupplierBoqNotification(
          supplierProfile.user.email,
          supplierProfile.company?.tradingName ||
            supplierProfile.company?.legalName ||
            `${supplierProfile.firstName} ${supplierProfile.lastName}`,
          access.projectInfo?.name || boq.title || 'New Project',
          boq.boqNumber,
          sectionTitles,
          access.customerInfo,
        );

        if (success) {
          access.notificationSentAt = now().toJSDate();
          accessesToUpdate.push(access);
          notifiedCount++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to notify supplier ${access.supplierProfileId}:`,
          error,
        );
      }
    }

    if (accessesToUpdate.length > 0) {
      await this.accessRepository.save(accessesToUpdate);
    }

    return notifiedCount;
  }

  /**
   * Get BOQ for a specific supplier (shows ALL sections so supplier can quote accurately)
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

    // Get only sections the supplier has capability for
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
   * Get full RFQ items with detailed specifications for a BOQ
   * This returns the itemized RFQ data so suppliers can see full details
   */
  async getRfqItemsForBoq(
    boqId: number,
    supplierProfileId: number,
  ): Promise<
    (RfqItem & {
      flangeStandardCode?: string;
      flangePressureClassDesignation?: string;
    })[]
  > {
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

    if (!boq || !boq.rfq) {
      return [];
    }

    const rfqItems = await this.rfqItemRepository.find({
      where: { rfq: { id: boq.rfq.id } },
      relations: ['straightPipeDetails', 'bendDetails', 'fittingDetails'],
      order: { lineNumber: 'ASC' },
    });

    const flangeStandardIds = new Set<number>();
    const flangePressureClassIds = new Set<number>();

    rfqItems.forEach((item) => {
      if (item.bendDetails?.flangeStandardId) {
        flangeStandardIds.add(item.bendDetails.flangeStandardId);
      }
      if (item.bendDetails?.flangePressureClassId) {
        flangePressureClassIds.add(item.bendDetails.flangePressureClassId);
      }
    });

    const flangeStandardsMap = new Map<number, string>();
    const flangePressureClassesMap = new Map<number, string>();

    if (flangeStandardIds.size > 0) {
      const standards = await this.flangeStandardRepository.find({
        where: { id: In([...flangeStandardIds]) },
      });
      standards.forEach((s) => flangeStandardsMap.set(s.id, s.code));
    }

    if (flangePressureClassIds.size > 0) {
      const pressureClasses = await this.flangePressureClassRepository.find({
        where: { id: In([...flangePressureClassIds]) },
      });
      pressureClasses.forEach((pc) =>
        flangePressureClassesMap.set(pc.id, pc.designation),
      );
    }

    return rfqItems.map((item) => ({
      ...item,
      flangeStandardCode: item.bendDetails?.flangeStandardId
        ? flangeStandardsMap.get(item.bendDetails.flangeStandardId)
        : undefined,
      flangePressureClassDesignation: item.bendDetails?.flangePressureClassId
        ? flangePressureClassesMap.get(item.bendDetails.flangePressureClassId)
        : undefined,
    }));
  }

  /**
   * Mark BOQ as viewed by supplier
   */
  async markAsViewed(
    boqId: number,
    supplierProfileId: number,
  ): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findOne({
      where: { boqId, supplierProfileId },
    });

    if (!access) {
      throw new NotFoundException(
        `Supplier ${supplierProfileId} does not have access to BOQ ${boqId}`,
      );
    }

    if (!access.viewedAt) {
      access.viewedAt = now().toJSDate();
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
    access.respondedAt = now().toJSDate();

    await this.accessRepository.save(access);
    return access;
  }

  /**
   * Set email reminder for BOQ closing date
   */
  async setReminder(
    boqId: number,
    supplierProfileId: number,
    reminderDays: number | null,
  ): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findOne({
      where: { boqId, supplierProfileId },
    });

    if (!access) {
      throw new NotFoundException(
        `Supplier ${supplierProfileId} does not have access to BOQ ${boqId}`,
      );
    }

    access.reminderDays = reminderDays ?? undefined;
    access.reminderSent = false;

    await this.accessRepository.save(access);
    return access;
  }

  /**
   * Save quote progress for a BOQ
   */
  async saveQuoteProgress(
    boqId: number,
    supplierProfileId: number,
    quoteData: {
      pricingInputs: Record<string, any>;
      unitPrices: Record<string, Record<number, number>>;
      weldUnitPrices: Record<string, number>;
    },
  ): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findOne({
      where: { boqId, supplierProfileId },
    });

    if (!access) {
      throw new NotFoundException(
        `Supplier ${supplierProfileId} does not have access to BOQ ${boqId}`,
      );
    }

    access.quoteData = quoteData;
    access.quoteSavedAt = now().toJSDate();

    await this.accessRepository.save(access);
    return access;
  }

  /**
   * Submit quote for a BOQ
   */
  async submitQuote(
    boqId: number,
    supplierProfileId: number,
    quoteData: {
      pricingInputs: Record<string, any>;
      unitPrices: Record<string, Record<number, number>>;
      weldUnitPrices: Record<string, number>;
    },
  ): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findOne({
      where: { boqId, supplierProfileId },
    });

    if (!access) {
      throw new NotFoundException(
        `Supplier ${supplierProfileId} does not have access to BOQ ${boqId}`,
      );
    }

    access.quoteData = quoteData;
    access.quoteSavedAt = now().toJSDate();
    access.quoteSubmittedAt = now().toJSDate();
    access.respondedAt = now().toJSDate();
    access.status = SupplierBoqStatus.QUOTED;

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
      if (!access.boq) {
        this.logger.warn(
          `BOQ not found for access record ${access.id}, boqId: ${access.boqId}`,
        );
        continue;
      }

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
    const notifiedCount = await this.sendUpdateNotifications(
      boq,
      newAccessRecords,
    );

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

  private async sendUpdateNotifications(
    boq: Boq,
    accessRecords: BoqSupplierAccess[],
  ): Promise<number> {
    if (accessRecords.length === 0) {
      return 0;
    }

    const supplierProfileIds = [
      ...new Set(accessRecords.map((access) => access.supplierProfileId)),
    ];

    const supplierProfiles = await this.supplierProfileRepository.find({
      where: { id: In(supplierProfileIds) },
      relations: ['user', 'company'],
    });

    const supplierProfileMap = new Map(
      supplierProfiles.map((profile) => [profile.id, profile]),
    );

    let notifiedCount = 0;

    for (const access of accessRecords) {
      try {
        const supplierProfile = supplierProfileMap.get(
          access.supplierProfileId,
        );

        if (!supplierProfile?.user?.email) continue;

        const sectionTitles = access.allowedSections.map((s) =>
          getSectionTitle(s),
        );

        const success = await this.emailService.sendBoqUpdateNotification(
          supplierProfile.user.email,
          supplierProfile.company?.tradingName ||
            supplierProfile.company?.legalName ||
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

  /**
   * Update allowed sections for all non-submitted BOQs when supplier capabilities change
   */
  async updateSupplierAllowedSections(
    supplierProfileId: number,
    newCapabilities: string[],
  ): Promise<{ updated: number; removed: number }> {
    const capabilitySections = getSectionsForCapabilities(newCapabilities);

    const accessRecords = await this.accessRepository.find({
      where: {
        supplierProfileId,
        status: In([
          SupplierBoqStatus.PENDING,
          SupplierBoqStatus.VIEWED,
          SupplierBoqStatus.DECLINED,
        ]),
      },
    });

    if (accessRecords.length === 0) {
      return { updated: 0, removed: 0 };
    }

    const boqIds = [...new Set(accessRecords.map((access) => access.boqId))];

    const allBoqSections = await this.sectionRepository.find({
      where: { boqId: In(boqIds) },
      select: ['boqId', 'sectionType'],
    });

    const sectionsByBoqId = allBoqSections.reduce((acc, section) => {
      const sections = acc.get(section.boqId) || [];
      sections.push(section.sectionType);
      acc.set(section.boqId, sections);
      return acc;
    }, new Map<number, string[]>());

    const accessesToUpdate: BoqSupplierAccess[] = [];
    const accessesToRemove: BoqSupplierAccess[] = [];

    for (const access of accessRecords) {
      const boqSectionTypes = sectionsByBoqId.get(access.boqId) || [];
      const newAllowedSections = boqSectionTypes.filter((sectionType) =>
        capabilitySections.includes(sectionType),
      );

      if (newAllowedSections.length === 0) {
        accessesToRemove.push(access);
      } else if (
        JSON.stringify(newAllowedSections.sort()) !==
        JSON.stringify(access.allowedSections.sort())
      ) {
        access.allowedSections = newAllowedSections;
        accessesToUpdate.push(access);
      }
    }

    if (accessesToRemove.length > 0) {
      await this.accessRepository.remove(accessesToRemove);
    }

    if (accessesToUpdate.length > 0) {
      await this.accessRepository.save(accessesToUpdate);
    }

    this.logger.log(
      `Updated allowed sections for supplier ${supplierProfileId}: ${accessesToUpdate.length} updated, ${accessesToRemove.length} removed`,
    );

    return {
      updated: accessesToUpdate.length,
      removed: accessesToRemove.length,
    };
  }
}
