import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EmailService } from "../email/email.service";
import { FlangePressureClassRepository } from "../flange-pressure-class/flange-pressure-class.repository";
import { FlangeStandardRepository } from "../flange-standard/flange-standard.repository";
import { now } from "../lib/datetime";
import { RfqItem } from "../rfq/entities/rfq-item.entity";
import { RfqItemRepository } from "../rfq/rfq-item.repository";
import { ProductCategory } from "../supplier/entities/supplier-capability.entity";
import { SupplierAccountStatus } from "../supplier/entities/supplier-profile.entity";
import { SupplierCapabilityRepository } from "../supplier/supplier-capability.repository";
import { SupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { BoqRepository } from "./boq.repository";
import { BoqSectionRepository } from "./boq-section.repository";
import { BoqSupplierAccessRepository } from "./boq-supplier-access.repository";
import {
  BOQ_SECTION_TO_CAPABILITY,
  sectionsForCapabilities,
  sectionTitle,
} from "./config/capability-mapping";
import { Boq, BoqStatus } from "./entities/boq.entity";
import { BoqSection } from "./entities/boq-section.entity";
import { BoqSupplierAccess, SupplierBoqStatus } from "./entities/boq-supplier-access.entity";

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
    gussetTeeWeld?: number;
    latWeld45Plus?: number;
    latWeldUnder45?: number;
  };
  weldCounts?: {
    pipeWeld?: number;
    flangeWeld?: number;
    mitreWeld?: number;
    teeWeld?: number;
    gussetTeeWeld?: number;
    latWeld45Plus?: number;
    latWeldUnder45?: number;
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
  hdpeStubs?: ConsolidatedItem[];
  pvcStubs?: ConsolidatedItem[];
  pvcCouplings?: ConsolidatedItem[];
  surfaceProtection?: ConsolidatedItem[];
  externalCoating?: ConsolidatedItem[];
  rubberLining?: ConsolidatedItem[];
  ceramicLining?: ConsolidatedItem[];
  hdpePipes?: ConsolidatedItem[];
  pvcPipes?: ConsolidatedItem[];
  structuralSteel?: ConsolidatedItem[];
  valves?: ConsolidatedItem[];
  instruments?: ConsolidatedItem[];
  actuators?: ConsolidatedItem[];
  flowMeters?: ConsolidatedItem[];
  pressureInstruments?: ConsolidatedItem[];
  levelInstruments?: ConsolidatedItem[];
  temperatureInstruments?: ConsolidatedItem[];
  pumps?: ConsolidatedItem[];
  pumpParts?: ConsolidatedItem[];
  pumpSpares?: ConsolidatedItem[];
  pumpRepairs?: ConsolidatedItem[];
  pumpRental?: ConsolidatedItem[];
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

const DATA_KEY_TO_SECTION: Record<string, string> = {
  straightPipes: "straight_pipes",
  bends: "bends",
  tees: "tees",
  reducers: "reducers",
  flanges: "flanges",
  blankFlanges: "blank_flanges",
  bnwSets: "bnw_sets",
  gaskets: "gaskets",
  hdpeStubs: "hdpe_stubs",
  pvcStubs: "pvc_stubs",
  pvcCouplings: "pvc_couplings",
  surfaceProtection: "surface_protection",
  externalCoating: "external_coating",
  rubberLining: "rubber_lining",
  ceramicLining: "ceramic_lining",
  hdpePipes: "hdpe_pipes",
  pvcPipes: "pvc_pipes",
  structuralSteel: "structural_steel",
  valves: "valves",
  instruments: "instruments",
  actuators: "actuators",
  flowMeters: "flow_meters",
  pressureInstruments: "pressure_instruments",
  levelInstruments: "level_instruments",
  temperatureInstruments: "temperature_instruments",
  pumps: "pumps",
  pumpParts: "pump_parts",
  pumpSpares: "pump_spares",
  pumpRepairs: "pump_repairs",
  pumpRental: "pump_rental",
};

const PRODUCT_CATEGORY_TO_CAPABILITY: Record<ProductCategory, string> = {
  [ProductCategory.STRAIGHT_PIPE]: "fabricated_steel",
  [ProductCategory.BENDS]: "fabricated_steel",
  [ProductCategory.FLANGES]: "fabricated_steel",
  [ProductCategory.FITTINGS]: "fabricated_steel",
  [ProductCategory.VALVES]: "fabricated_steel",
  [ProductCategory.FABRICATION]: "fabricated_steel",
  [ProductCategory.COATING]: "surface_protection",
  [ProductCategory.INSPECTION]: "surface_protection",
  [ProductCategory.OTHER]: "fabricated_steel",
  [ProductCategory.FABRICATED_STEEL]: "fabricated_steel",
  [ProductCategory.FASTENERS_GASKETS]: "fasteners_gaskets",
  [ProductCategory.SURFACE_PROTECTION]: "surface_protection",
  [ProductCategory.HDPE]: "hdpe",
  [ProductCategory.PVC]: "pvc",
  [ProductCategory.STRUCTURAL_STEEL]: "structural_steel",
  [ProductCategory.TRANSPORT_INSTALL]: "transport_install",
  [ProductCategory.VALVES_INSTRUMENTS]: "valves_instruments",
  [ProductCategory.PUMPS]: "pumps",
};

@Injectable()
export class BoqDistributionService {
  private readonly logger = new Logger(BoqDistributionService.name);

  constructor(
    private readonly boqRepository: BoqRepository,
    private readonly sectionRepository: BoqSectionRepository,
    private readonly accessRepository: BoqSupplierAccessRepository,
    private supplierProfileRepository: SupplierProfileRepository,
    private capabilityRepository: SupplierCapabilityRepository,
    private onboardingRepository: SupplierOnboardingRepository,
    private rfqItemRepository: RfqItemRepository,
    private flangeStandardRepository: FlangeStandardRepository,
    private flangePressureClassRepository: FlangePressureClassRepository,
    private emailService: EmailService,
  ) {}

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
    const boq = await this.boqRepository.findById(boqId, ["rfq"]);

    if (!boq) {
      throw new NotFoundException(`BOQ with ID ${boqId} not found`);
    }

    this.logger.log(`Submitting BOQ ${boq.boqNumber} for quotation`);

    const sections = await this.generateSections(boqId, boqData);
    this.logger.log(`Generated ${sections.length} sections for BOQ ${boq.boqNumber}`);

    const supplierAccessRecords = await this.findAndCreateSupplierAccess(
      boqId,
      sections,
      customerInfo,
      projectInfo,
    );
    this.logger.log(`Created ${supplierAccessRecords.length} supplier access records`);

    const notifiedCount = await this.notifySuppliers(boq, supplierAccessRecords);
    this.logger.log(`Notified ${notifiedCount} suppliers`);

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

  async generateSections(boqId: number, boqData: ConsolidatedBoqData): Promise<BoqSection[]> {
    await this.sectionRepository.deleteByBoqId(boqId);

    const sections = Object.entries(DATA_KEY_TO_SECTION).reduce((acc, [dataKey, sectionType]) => {
      const items = boqData[dataKey as keyof ConsolidatedBoqData];

      if (!items || !Array.isArray(items) || items.length === 0) {
        return acc;
      }

      const capabilityKey = BOQ_SECTION_TO_CAPABILITY[sectionType];

      if (!capabilityKey) {
        this.logger.warn(`No capability mapping for section type: ${sectionType}`);
        return acc;
      }

      const totalWeightKg = items.reduce((sum, item) => sum + (item.weightKg || 0), 0);

      const section: Partial<BoqSection> = {
        boqId,
        sectionType,
        capabilityKey,
        sectionTitle: sectionTitle(sectionType),
        items,
        totalWeightKg,
        itemCount: items.length,
      };

      return [...acc, section as BoqSection];
    }, [] as BoqSection[]);

    if (sections.length > 0) {
      return Promise.all(sections.map((s) => this.sectionRepository.create(s)));
    }

    return sections;
  }

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
    await this.accessRepository.deleteByBoqId(boqId);

    const requiredCapabilities = [...new Set(sections.map((s) => s.capabilityKey))];
    this.logger.log(`Required capabilities: ${requiredCapabilities.join(", ")}`);

    const approvedOnboardings = await this.onboardingRepository.findApprovedWithSupplier();

    const approvedSupplierIds = approvedOnboardings
      .filter((o) => o.supplier?.accountStatus === SupplierAccountStatus.ACTIVE)
      .map((o) => o.supplierId);

    if (approvedSupplierIds.length === 0) {
      this.logger.warn("No approved suppliers found");
      return [];
    }

    const capabilities =
      await this.capabilityRepository.findActiveBySupplierIdsWithRelations(approvedSupplierIds);

    const supplierCapabilities = capabilities.reduce((acc, cap) => {
      const capabilityKey = PRODUCT_CATEGORY_TO_CAPABILITY[cap.productCategory];
      if (!capabilityKey) {
        return acc;
      }

      const existing = acc.get(cap.supplierProfileId) ?? new Set<string>();
      return new Map(acc).set(cap.supplierProfileId, new Set([...existing, capabilityKey]));
    }, new Map<number, Set<string>>());

    const accessRecords = await [...supplierCapabilities.entries()].reduce(
      async (accPromise, [supplierProfileId, capabilityKeys]) => {
        const acc = await accPromise;
        const allowedSections = sections
          .filter((s) => capabilityKeys.has(s.capabilityKey))
          .map((s) => s.sectionType);

        if (allowedSections.length === 0) {
          return acc;
        }

        const access = await this.accessRepository.create({
          boqId,
          supplierProfileId,
          allowedSections,
          status: SupplierBoqStatus.PENDING,
          customerInfo,
          projectInfo,
        });

        return [...acc, access];
      },
      Promise.resolve([] as BoqSupplierAccess[]),
    );

    return accessRecords;
  }

  async notifySuppliers(boq: Boq, accessRecords: BoqSupplierAccess[]): Promise<number> {
    if (accessRecords.length === 0) {
      return 0;
    }

    const supplierProfileIds = [
      ...new Set(accessRecords.map((access) => access.supplierProfileId)),
    ];

    const supplierProfiles =
      await this.supplierProfileRepository.findByIdsWithUserAndCompany(supplierProfileIds);

    const supplierProfileMap = new Map(supplierProfiles.map((profile) => [profile.id, profile]));

    const result = await accessRecords.reduce(
      async (accPromise, access) => {
        const acc = await accPromise;
        try {
          const supplierProfile = supplierProfileMap.get(access.supplierProfileId);

          if (!supplierProfile?.user?.email) {
            this.logger.warn(`Supplier profile ${access.supplierProfileId} has no email`);
            return acc;
          }

          const sectionTitles = access.allowedSections.map((s) => sectionTitle(s));

          const success = await this.emailService.sendSupplierBoqNotification(
            supplierProfile.user.email,
            supplierProfile.company?.tradingName ||
              supplierProfile.company?.legalName ||
              `${supplierProfile.firstName} ${supplierProfile.lastName}`,
            access.projectInfo?.name || boq.title || "New Project",
            boq.boqNumber,
            sectionTitles,
            access.customerInfo,
          );

          if (success) {
            access.notificationSentAt = now().toJSDate();
            const updated = await this.accessRepository.save(access);
            return {
              notifiedCount: acc.notifiedCount + 1,
              accessesToUpdate: [...acc.accessesToUpdate, updated],
            };
          }

          return acc;
        } catch (error) {
          this.logger.error(`Failed to notify supplier ${access.supplierProfileId}:`, error);
          return acc;
        }
      },
      Promise.resolve({ notifiedCount: 0, accessesToUpdate: [] as BoqSupplierAccess[] }),
    );

    return result.notifiedCount;
  }

  async getFilteredBoqForSupplier(
    boqId: number,
    supplierProfileId: number,
  ): Promise<{
    boq: Boq;
    sections: BoqSection[];
    access: BoqSupplierAccess;
  }> {
    const access = await this.accessRepository.findByBoqAndSupplier(boqId, supplierProfileId);

    if (!access) {
      throw new NotFoundException(
        `Supplier ${supplierProfileId} does not have access to BOQ ${boqId}`,
      );
    }

    const boq = await this.boqRepository.findById(boqId, ["rfq"]);

    if (!boq) {
      throw new NotFoundException(`BOQ with ID ${boqId} not found`);
    }

    const sections = await this.sectionRepository.findByBoqIdAndSectionTypes(
      boqId,
      access.allowedSections,
    );

    return { boq, sections, access };
  }

  async getRfqItemsForBoq(
    boqId: number,
    supplierProfileId: number,
  ): Promise<
    (RfqItem & {
      flangeStandardCode?: string;
      flangePressureClassDesignation?: string;
    })[]
  > {
    const access = await this.accessRepository.findByBoqAndSupplier(boqId, supplierProfileId);

    if (!access) {
      throw new NotFoundException(
        `Supplier ${supplierProfileId} does not have access to BOQ ${boqId}`,
      );
    }

    const boq = await this.boqRepository.findById(boqId, ["rfq"]);

    if (!boq?.rfq) {
      return [];
    }

    const rfqItems = await this.rfqItemRepository.findByRfqIdWithRelationsOrderedByLineNumber(
      boq.rfq.id,
      ["straightPipeDetails", "bendDetails", "fittingDetails"],
    );

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
      const standards = await this.flangeStandardRepository.findByIds([...flangeStandardIds]);
      standards.forEach((s) => flangeStandardsMap.set(s.id, s.code));
    }

    if (flangePressureClassIds.size > 0) {
      const pressureClasses = await this.flangePressureClassRepository.findByIds([
        ...flangePressureClassIds,
      ]);
      pressureClasses.forEach((pc) => flangePressureClassesMap.set(pc.id, pc.designation));
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

  async markAsViewed(boqId: number, supplierProfileId: number): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findByBoqAndSupplier(boqId, supplierProfileId);

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

  async declineBoq(
    boqId: number,
    supplierProfileId: number,
    reason: string,
  ): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findByBoqAndSupplier(boqId, supplierProfileId);

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

  async setReminder(
    boqId: number,
    supplierProfileId: number,
    reminderDays: number | null,
  ): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findByBoqAndSupplier(boqId, supplierProfileId);

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

  async saveQuoteProgress(
    boqId: number,
    supplierProfileId: number,
    quoteData: {
      pricingInputs: Record<string, any>;
      unitPrices: Record<string, Record<number, number>>;
      weldUnitPrices: Record<string, number>;
    },
  ): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findByBoqAndSupplier(boqId, supplierProfileId);

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

  async submitQuote(
    boqId: number,
    supplierProfileId: number,
    quoteData: {
      pricingInputs: Record<string, any>;
      unitPrices: Record<string, Record<number, number>>;
      weldUnitPrices: Record<string, number>;
    },
  ): Promise<BoqSupplierAccess> {
    const access = await this.accessRepository.findByBoqAndSupplier(boqId, supplierProfileId);

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
    const accessRecords = await this.accessRepository.findBySupplier(supplierProfileId, status);

    const validAccessRecords = accessRecords.filter((access) => {
      if (!access.boq) {
        this.logger.warn(`BOQ not found for access record ${access.id}, boqId: ${access.boqId}`);
        return false;
      }
      return true;
    });

    const allBoqIds = [...new Set(validAccessRecords.map((a) => a.boqId))];
    const allAllowedSections = [...new Set(validAccessRecords.flatMap((a) => a.allowedSections))];

    const allSections =
      allBoqIds.length > 0
        ? await this.sectionRepository.findByBoqIdsAndSectionTypes(allBoqIds, allAllowedSections)
        : [];

    const sectionsByBoqId = allSections.reduce(
      (acc, section) => {
        const existing = acc[section.boqId] ?? [];
        return { ...acc, [section.boqId]: [...existing, section] };
      },
      {} as Record<number, BoqSection[]>,
    );

    return validAccessRecords.map((access) => {
      const boqSections = sectionsByBoqId[access.boqId] ?? [];
      const allowedSet = new Set(access.allowedSections);
      const sectionSummary = boqSections
        .filter((s) => allowedSet.has(s.sectionType))
        .map((s) => ({
          type: s.sectionType,
          title: s.sectionTitle,
          itemCount: s.itemCount,
        }));

      return {
        access,
        boq: access.boq,
        sectionSummary,
      };
    });
  }

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
    const boq = await this.boqRepository.findById(boqId, ["rfq"]);

    if (!boq) {
      throw new NotFoundException(`BOQ with ID ${boqId} not found`);
    }

    this.logger.log(`Updating BOQ ${boq.boqNumber}`);

    const sections = await this.generateSections(boqId, boqData);

    const newAccessRecords = await this.findAndCreateSupplierAccess(
      boqId,
      sections,
      customerInfo,
      projectInfo,
    );

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

    const supplierProfiles =
      await this.supplierProfileRepository.findByIdsWithUserAndCompany(supplierProfileIds);

    const supplierProfileMap = new Map(supplierProfiles.map((profile) => [profile.id, profile]));

    return accessRecords.reduce(async (accPromise, access) => {
      const acc = await accPromise;
      try {
        const supplierProfile = supplierProfileMap.get(access.supplierProfileId);

        if (!supplierProfile?.user?.email) {
          return acc;
        }

        const sectionTitles = access.allowedSections.map((s) => sectionTitle(s));

        const success = await this.emailService.sendBoqUpdateNotification(
          supplierProfile.user.email,
          supplierProfile.company?.tradingName ||
            supplierProfile.company?.legalName ||
            `${supplierProfile.firstName} ${supplierProfile.lastName}`,
          access.projectInfo?.name || boq.title || "Project",
          boq.boqNumber,
          sectionTitles,
        );

        return success ? acc + 1 : acc;
      } catch (error) {
        this.logger.error(
          `Failed to send update notification to supplier ${access.supplierProfileId}:`,
          error,
        );
        return acc;
      }
    }, Promise.resolve(0));
  }

  async updateSupplierAllowedSections(
    supplierProfileId: number,
    newCapabilities: string[],
  ): Promise<{ updated: number; removed: number }> {
    const capabilitySections = sectionsForCapabilities(newCapabilities);

    const accessRecords = await this.accessRepository.findBySupplierAndStatuses(supplierProfileId, [
      SupplierBoqStatus.PENDING,
      SupplierBoqStatus.VIEWED,
      SupplierBoqStatus.DECLINED,
    ]);

    if (accessRecords.length === 0) {
      return { updated: 0, removed: 0 };
    }

    const boqIds = [...new Set(accessRecords.map((access) => access.boqId))];

    const allBoqSections = await this.sectionRepository.findByBoqIds(boqIds);

    const sectionsByBoqId = allBoqSections.reduce((acc, section) => {
      const existing = acc.get(section.boqId) || [];
      return new Map(acc).set(section.boqId, [...existing, section.sectionType]);
    }, new Map<number, string[]>());

    const { accessesToUpdate, accessesToRemove } = accessRecords.reduce(
      (acc, access) => {
        const boqSectionTypes = sectionsByBoqId.get(access.boqId) || [];
        const newAllowedSections = boqSectionTypes.filter((sectionType) =>
          capabilitySections.includes(sectionType),
        );

        if (newAllowedSections.length === 0) {
          return { ...acc, accessesToRemove: [...acc.accessesToRemove, access] };
        } else if (
          JSON.stringify(newAllowedSections.sort()) !==
          JSON.stringify(access.allowedSections.sort())
        ) {
          access.allowedSections = newAllowedSections;
          return { ...acc, accessesToUpdate: [...acc.accessesToUpdate, access] };
        }

        return acc;
      },
      {
        accessesToUpdate: [] as BoqSupplierAccess[],
        accessesToRemove: [] as BoqSupplierAccess[],
      },
    );

    await Promise.all(accessesToRemove.map((a) => this.accessRepository.remove(a)));
    await Promise.all(accessesToUpdate.map((a) => this.accessRepository.save(a)));

    this.logger.log(
      `Updated allowed sections for supplier ${supplierProfileId}: ${accessesToUpdate.length} updated, ${accessesToRemove.length} removed`,
    );

    return {
      updated: accessesToUpdate.length,
      removed: accessesToRemove.length,
    };
  }
}
