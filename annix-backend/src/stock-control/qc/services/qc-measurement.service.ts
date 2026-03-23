import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobCardCoatingAnalysis } from "../../entities/coating-analysis.entity";
import { JobCard } from "../../entities/job-card.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";
import { QcBlastProfile } from "../entities/qc-blast-profile.entity";
import {
  type PartySignOff,
  QcControlPlan,
  type QcpActivity,
  type QcpApprovalSignature,
  QcpPlanType,
} from "../entities/qc-control-plan.entity";
import { QcDefelskoBatch } from "../entities/qc-defelsko-batch.entity";
import { QcDftReading } from "../entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "../entities/qc-dust-debris-test.entity";
import {
  ItemReleaseResult,
  QcItemsRelease,
  ReleaseLineItem,
} from "../entities/qc-items-release.entity";
import { QcPullTest } from "../entities/qc-pull-test.entity";
import {
  type BlastingCheck,
  type FinalInspection,
  type PaintingCheck,
  QcCheckResult,
  QcReleaseCertificate,
} from "../entities/qc-release-certificate.entity";
import { QcShoreHardness } from "../entities/qc-shore-hardness.entity";
import { type IWorkItemProvider, WORK_ITEM_PROVIDER } from "../work-item-provider.interface";

type QcEntity =
  | QcShoreHardness
  | QcDftReading
  | QcBlastProfile
  | QcDustDebrisTest
  | QcPullTest
  | QcControlPlan
  | QcReleaseCertificate
  | QcItemsRelease;

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

@Injectable()
export class QcMeasurementService {
  private readonly logger = new Logger(QcMeasurementService.name);

  constructor(
    @InjectRepository(QcShoreHardness)
    private readonly shoreHardnessRepo: Repository<QcShoreHardness>,
    @InjectRepository(QcDftReading)
    private readonly dftReadingRepo: Repository<QcDftReading>,
    @InjectRepository(QcBlastProfile)
    private readonly blastProfileRepo: Repository<QcBlastProfile>,
    @InjectRepository(QcDustDebrisTest)
    private readonly dustDebrisRepo: Repository<QcDustDebrisTest>,
    @InjectRepository(QcPullTest)
    private readonly pullTestRepo: Repository<QcPullTest>,
    @InjectRepository(QcControlPlan)
    private readonly controlPlanRepo: Repository<QcControlPlan>,
    @InjectRepository(QcReleaseCertificate)
    private readonly releaseCertRepo: Repository<QcReleaseCertificate>,
    @InjectRepository(QcItemsRelease)
    private readonly itemsReleaseRepo: Repository<QcItemsRelease>,
    @InjectRepository(QcDefelskoBatch)
    private readonly defelskoBatchRepo: Repository<QcDefelskoBatch>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingRepo: Repository<JobCardCoatingAnalysis>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    @Inject(WORK_ITEM_PROVIDER)
    private readonly workItemProvider: IWorkItemProvider,
  ) {}

  // ── Shore Hardness ──────────────────────────────────────────────────

  async shoreHardnessForJobCard(companyId: number, jobCardId: number): Promise<QcShoreHardness[]> {
    return this.shoreHardnessRepo.find({
      where: { companyId, jobCardId },
      order: { readingDate: "DESC", createdAt: "DESC" },
    });
  }

  async shoreHardnessById(companyId: number, id: number): Promise<QcShoreHardness> {
    return this.findOrFail(this.shoreHardnessRepo, companyId, id, "Shore hardness record");
  }

  async createShoreHardness(
    companyId: number,
    jobCardId: number,
    data: Partial<QcShoreHardness>,
    user: UserContext,
  ): Promise<QcShoreHardness> {
    const record = this.shoreHardnessRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
    return this.shoreHardnessRepo.save(record);
  }

  async updateShoreHardness(
    companyId: number,
    id: number,
    data: Partial<QcShoreHardness>,
  ): Promise<QcShoreHardness> {
    const record = await this.findOrFail(
      this.shoreHardnessRepo,
      companyId,
      id,
      "Shore hardness record",
    );
    Object.assign(record, data);
    return this.shoreHardnessRepo.save(record);
  }

  async deleteShoreHardness(companyId: number, id: number): Promise<void> {
    const record = await this.findOrFail(
      this.shoreHardnessRepo,
      companyId,
      id,
      "Shore hardness record",
    );
    await this.shoreHardnessRepo.remove(record);
  }

  // ── DFT Readings ───────────────────────────────────────────────────

  async dftReadingsForJobCard(companyId: number, jobCardId: number): Promise<QcDftReading[]> {
    return this.dftReadingRepo.find({
      where: { companyId, jobCardId },
      order: { readingDate: "DESC", createdAt: "DESC" },
    });
  }

  async dftReadingById(companyId: number, id: number): Promise<QcDftReading> {
    return this.findOrFail(this.dftReadingRepo, companyId, id, "DFT reading");
  }

  async createDftReading(
    companyId: number,
    jobCardId: number,
    data: Partial<QcDftReading>,
    user: UserContext,
  ): Promise<QcDftReading> {
    const record = this.dftReadingRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
    return this.dftReadingRepo.save(record);
  }

  async updateDftReading(
    companyId: number,
    id: number,
    data: Partial<QcDftReading>,
  ): Promise<QcDftReading> {
    const record = await this.findOrFail(this.dftReadingRepo, companyId, id, "DFT reading");
    Object.assign(record, data);
    return this.dftReadingRepo.save(record);
  }

  async deleteDftReading(companyId: number, id: number): Promise<void> {
    const record = await this.findOrFail(this.dftReadingRepo, companyId, id, "DFT reading");
    await this.dftReadingRepo.remove(record);
  }

  // ── Blast Profiles ─────────────────────────────────────────────────

  async blastProfilesForJobCard(companyId: number, jobCardId: number): Promise<QcBlastProfile[]> {
    return this.blastProfileRepo.find({
      where: { companyId, jobCardId },
      order: { readingDate: "DESC", createdAt: "DESC" },
    });
  }

  async blastProfileById(companyId: number, id: number): Promise<QcBlastProfile> {
    return this.findOrFail(this.blastProfileRepo, companyId, id, "Blast profile");
  }

  async createBlastProfile(
    companyId: number,
    jobCardId: number,
    data: Partial<QcBlastProfile>,
    user: UserContext,
  ): Promise<QcBlastProfile> {
    const record = this.blastProfileRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
    return this.blastProfileRepo.save(record);
  }

  async updateBlastProfile(
    companyId: number,
    id: number,
    data: Partial<QcBlastProfile>,
  ): Promise<QcBlastProfile> {
    const record = await this.findOrFail(this.blastProfileRepo, companyId, id, "Blast profile");
    Object.assign(record, data);
    return this.blastProfileRepo.save(record);
  }

  async deleteBlastProfile(companyId: number, id: number): Promise<void> {
    const record = await this.findOrFail(this.blastProfileRepo, companyId, id, "Blast profile");
    await this.blastProfileRepo.remove(record);
  }

  // ── Dust & Debris Tests ────────────────────────────────────────────

  async dustDebrisTestsForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<QcDustDebrisTest[]> {
    return this.dustDebrisRepo.find({
      where: { companyId, jobCardId },
      order: { readingDate: "DESC", createdAt: "DESC" },
    });
  }

  async dustDebrisTestById(companyId: number, id: number): Promise<QcDustDebrisTest> {
    return this.findOrFail(this.dustDebrisRepo, companyId, id, "Dust/debris test");
  }

  async createDustDebrisTest(
    companyId: number,
    jobCardId: number,
    data: Partial<QcDustDebrisTest>,
    user: UserContext,
  ): Promise<QcDustDebrisTest> {
    const record = this.dustDebrisRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
    return this.dustDebrisRepo.save(record);
  }

  async updateDustDebrisTest(
    companyId: number,
    id: number,
    data: Partial<QcDustDebrisTest>,
  ): Promise<QcDustDebrisTest> {
    const record = await this.findOrFail(this.dustDebrisRepo, companyId, id, "Dust/debris test");
    Object.assign(record, data);
    return this.dustDebrisRepo.save(record);
  }

  async deleteDustDebrisTest(companyId: number, id: number): Promise<void> {
    const record = await this.findOrFail(this.dustDebrisRepo, companyId, id, "Dust/debris test");
    await this.dustDebrisRepo.remove(record);
  }

  // ── Pull Tests ─────────────────────────────────────────────────────

  async pullTestsForJobCard(companyId: number, jobCardId: number): Promise<QcPullTest[]> {
    return this.pullTestRepo.find({
      where: { companyId, jobCardId },
      order: { readingDate: "DESC", createdAt: "DESC" },
    });
  }

  async pullTestById(companyId: number, id: number): Promise<QcPullTest> {
    return this.findOrFail(this.pullTestRepo, companyId, id, "Pull test");
  }

  async createPullTest(
    companyId: number,
    jobCardId: number,
    data: Partial<QcPullTest>,
    user: UserContext,
  ): Promise<QcPullTest> {
    const record = this.pullTestRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
    return this.pullTestRepo.save(record);
  }

  async updatePullTest(
    companyId: number,
    id: number,
    data: Partial<QcPullTest>,
  ): Promise<QcPullTest> {
    const record = await this.findOrFail(this.pullTestRepo, companyId, id, "Pull test");
    Object.assign(record, data);
    return this.pullTestRepo.save(record);
  }

  async deletePullTest(companyId: number, id: number): Promise<void> {
    const record = await this.findOrFail(this.pullTestRepo, companyId, id, "Pull test");
    await this.pullTestRepo.remove(record);
  }

  // ── Control Plans ──────────────────────────────────────────────────

  async controlPlansForJobCard(companyId: number, jobCardId: number): Promise<QcControlPlan[]> {
    return this.controlPlanRepo.find({
      where: { companyId, jobCardId },
      order: { createdAt: "DESC" },
    });
  }

  async controlPlanById(companyId: number, id: number): Promise<QcControlPlan> {
    return this.findOrFail(this.controlPlanRepo, companyId, id, "Control plan");
  }

  async createControlPlan(
    companyId: number,
    jobCardId: number,
    data: Partial<QcControlPlan>,
    user: UserContext,
  ): Promise<QcControlPlan> {
    const record = this.controlPlanRepo.create({
      ...data,
      companyId,
      jobCardId,
      createdByName: user.name,
      createdById: user.id,
    });
    return this.controlPlanRepo.save(record);
  }

  async updateControlPlan(
    companyId: number,
    id: number,
    data: Partial<QcControlPlan>,
  ): Promise<QcControlPlan> {
    const record = await this.findOrFail(this.controlPlanRepo, companyId, id, "Control plan");
    Object.assign(record, data);
    return this.controlPlanRepo.save(record);
  }

  async deleteControlPlan(companyId: number, id: number): Promise<void> {
    const record = await this.findOrFail(this.controlPlanRepo, companyId, id, "Control plan");
    await this.controlPlanRepo.remove(record);
  }

  async autoGenerateControlPlans(
    companyId: number,
    jobCardId: number,
    user: UserContext,
  ): Promise<QcControlPlan[]> {
    const [jobCard, coating, company] = await Promise.all([
      this.jobCardRepo.findOne({
        where: { id: jobCardId, companyId },
        relations: ["lineItems"],
      }),
      this.coatingRepo.findOne({ where: { jobCardId, companyId } }),
      this.companyRepo.findOne({ where: { id: companyId } }),
    ]);

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    const existing = await this.controlPlanRepo.find({
      where: { companyId, jobCardId },
    });

    const coats = Array.isArray(coating?.coats) ? coating.coats : [];
    const hasRubber = coating?.hasInternalLining === true;
    const hasPaint = coats.length > 0;
    const hasExternalPaint = coats.some((c: any) => c.area === "external");
    const hasInternalPaint = coats.some((c: any) => c.area === "internal");

    const planTypes: QcpPlanType[] = [];
    if (hasExternalPaint) planTypes.push(QcpPlanType.PAINT_EXTERNAL);
    if (hasInternalPaint) planTypes.push(QcpPlanType.PAINT_INTERNAL);
    if (hasRubber) planTypes.push(QcpPlanType.RUBBER);
    if (!hasPaint && !hasRubber) planTypes.push(QcpPlanType.PAINT_EXTERNAL);

    const existingTypes = new Set(existing.map((e) => e.planType));
    const toCreate = planTypes.filter((t) => !existingTypes.has(t));

    if (toCreate.length === 0) {
      return existing;
    }

    const customerName = jobCard.customerName || null;
    const orderNumber = jobCard.poNumber || null;
    const jobName = `${jobCard.jobNumber} - ${jobCard.jobName || ""}`.trim();
    const itemDescriptions = (jobCard.lineItems || [])
      .map((li: any) => li.itemDescription)
      .filter(Boolean)
      .join("; ");

    const emptySignOff = (): PartySignOff => ({
      interventionType: null,
      name: null,
      signatureUrl: null,
      date: null,
    });

    const defaultApprovals = (): QcpApprovalSignature[] => [
      { party: "PLS", name: null, signatureUrl: null, date: null },
      { party: "MPS", name: null, signatureUrl: null, date: null },
      { party: "Client", name: null, signatureUrl: null, date: null },
    ];

    const buildActivity = (
      opNum: number,
      description: string,
      spec: string | null,
    ): QcpActivity => ({
      operationNumber: opNum,
      description,
      specification: spec,
      procedureRequired: null,
      pls: emptySignOff(),
      mps: emptySignOff(),
      client: emptySignOff(),
      remarks: null,
    });

    const paintExternalActivities = (externalCoats: any[]): QcpActivity[] => {
      const activities: QcpActivity[] = [
        buildActivity(1, "Receive & inspect items", null),
        buildActivity(
          2,
          "Surface preparation - Abrasive blasting to SA 2.5",
          coating?.surfacePrep || null,
        ),
        buildActivity(3, "Dust and debris assessment", null),
      ];

      let opNum = 4;
      externalCoats.forEach((coat: any, idx: number) => {
        const dftSpec =
          coat.minDftUm && coat.maxDftUm ? `${coat.minDftUm}-${coat.maxDftUm} µm` : null;
        const label =
          idx === 0
            ? "primer"
            : idx === externalCoats.length - 1
              ? "final/topcoat"
              : "intermediate";
        activities.push(buildActivity(opNum++, `Apply ${label} - ${coat.product || "TBC"}`, null));
        activities.push(
          buildActivity(
            opNum++,
            `${label === "primer" ? "Primer" : label === "final/topcoat" ? "Final" : "Intermediate"} DFT measurement`,
            dftSpec,
          ),
        );
      });

      if (externalCoats.length === 0) {
        activities.push(buildActivity(opNum++, "Apply primer coat", null));
        activities.push(buildActivity(opNum++, "Primer DFT measurement", null));
        activities.push(buildActivity(opNum++, "Apply final/topcoat", null));
        activities.push(buildActivity(opNum++, "Final DFT measurement", null));
      }

      activities.push(buildActivity(opNum++, "Visual inspection", null));
      activities.push(buildActivity(opNum++, "Final release", null));
      return activities;
    };

    const paintInternalActivities = (internalCoats: any[]): QcpActivity[] => {
      const activities: QcpActivity[] = [
        buildActivity(1, "Receive & inspect items", null),
        buildActivity(
          2,
          "Surface preparation - Abrasive blasting to SA 2.5",
          coating?.surfacePrep || null,
        ),
        buildActivity(3, "Dust and debris assessment", null),
      ];

      let opNum = 4;
      internalCoats.forEach((coat: any, idx: number) => {
        const dftSpec =
          coat.minDftUm && coat.maxDftUm ? `${coat.minDftUm}-${coat.maxDftUm} µm` : null;
        const label = idx === 0 ? "internal primer" : "internal lining";
        activities.push(buildActivity(opNum++, `Apply ${label} - ${coat.product || "TBC"}`, null));
        activities.push(
          buildActivity(opNum++, `${idx === 0 ? "Primer" : "Final"} DFT measurement`, dftSpec),
        );
      });

      if (internalCoats.length === 0) {
        activities.push(buildActivity(opNum++, "Apply internal primer coat", null));
        activities.push(buildActivity(opNum++, "Primer DFT measurement", null));
        activities.push(buildActivity(opNum++, "Apply internal lining coat", null));
        activities.push(buildActivity(opNum++, "Final DFT measurement", null));
      }

      activities.push(buildActivity(opNum++, "Visual inspection", null));
      activities.push(buildActivity(opNum++, "Final release", null));
      return activities;
    };

    const rubberActivities = (): QcpActivity[] => [
      buildActivity(1, "Receive & inspect items", null),
      buildActivity(2, "Surface preparation - Abrasive blasting to SA 2.5", "SA 3"),
      buildActivity(3, "Contamination check", null),
      buildActivity(4, "Apply bonding solution/adhesive", null),
      buildActivity(5, "Apply rubber lining as per drawing", null),
      buildActivity(6, "Visual inspection - pre-cure", null),
      buildActivity(7, "Autoclave curing", null),
      buildActivity(8, "Shore hardness test", null),
      buildActivity(9, "Spark test", null),
      buildActivity(10, "Visual inspection - post-cure", null),
      buildActivity(11, "Final release", null),
    ];

    const activitiesForType = (planType: QcpPlanType): QcpActivity[] => {
      if (planType === QcpPlanType.PAINT_EXTERNAL) {
        return paintExternalActivities(coats.filter((c: any) => c.area === "external"));
      }
      if (planType === QcpPlanType.PAINT_INTERNAL) {
        return paintInternalActivities(coats.filter((c: any) => c.area === "internal"));
      }
      if (planType === QcpPlanType.RUBBER) {
        return rubberActivities();
      }
      return paintExternalActivities([]);
    };

    const companyPrefix = company?.name
      ? company.name.split(" ")[0].toUpperCase().slice(0, 3)
      : "QCP";

    const created = await Promise.all(
      toCreate.map((planType) => {
        const qcpNumber = `${companyPrefix}-${jobCard.jobNumber}-${planType.toUpperCase().replace("_", "-")}`;
        const record = this.controlPlanRepo.create({
          companyId,
          jobCardId,
          planType,
          qcpNumber,
          documentRef: null,
          revision: "01",
          customerName,
          orderNumber,
          jobName,
          specification: coating?.rawNotes || null,
          itemDescription: itemDescriptions || null,
          activities: activitiesForType(planType),
          approvalSignatures: defaultApprovals(),
          createdByName: user.name,
          createdById: user.id,
        });
        return this.controlPlanRepo.save(record);
      }),
    );

    this.logger.log(
      `Auto-generated ${created.length} QCP(s) for job card ${jobCardId}: ${toCreate.join(", ")}`,
    );

    return [...existing, ...created];
  }

  // ── Release Certificates ───────────────────────────────────────────

  async releaseCertificatesForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<QcReleaseCertificate[]> {
    return this.releaseCertRepo.find({
      where: { companyId, jobCardId },
      order: { createdAt: "DESC" },
    });
  }

  async releaseCertificateById(companyId: number, id: number): Promise<QcReleaseCertificate> {
    return this.findOrFail(this.releaseCertRepo, companyId, id, "Release certificate");
  }

  async createReleaseCertificate(
    companyId: number,
    jobCardId: number,
    data: Partial<QcReleaseCertificate>,
    user: UserContext,
  ): Promise<QcReleaseCertificate> {
    const record = this.releaseCertRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
    return this.releaseCertRepo.save(record);
  }

  async updateReleaseCertificate(
    companyId: number,
    id: number,
    data: Partial<QcReleaseCertificate>,
  ): Promise<QcReleaseCertificate> {
    const record = await this.findOrFail(
      this.releaseCertRepo,
      companyId,
      id,
      "Release certificate",
    );
    Object.assign(record, data);
    return this.releaseCertRepo.save(record);
  }

  async deleteReleaseCertificate(companyId: number, id: number): Promise<void> {
    const record = await this.findOrFail(
      this.releaseCertRepo,
      companyId,
      id,
      "Release certificate",
    );
    await this.releaseCertRepo.remove(record);
  }

  // ── Items Release ──────────────────────────────────────────────────

  async itemsReleasesForJobCard(companyId: number, jobCardId: number): Promise<QcItemsRelease[]> {
    return this.itemsReleaseRepo.find({
      where: { companyId, jobCardId },
      order: { createdAt: "DESC" },
    });
  }

  async itemsReleaseById(companyId: number, id: number): Promise<QcItemsRelease> {
    return this.findOrFail(this.itemsReleaseRepo, companyId, id, "Items release");
  }

  async createItemsRelease(
    companyId: number,
    jobCardId: number,
    data: Partial<QcItemsRelease>,
    user: UserContext,
  ): Promise<QcItemsRelease> {
    const record = this.itemsReleaseRepo.create({
      ...data,
      companyId,
      jobCardId,
      createdByName: user.name,
      createdById: user.id,
    });
    return this.itemsReleaseRepo.save(record);
  }

  async updateItemsRelease(
    companyId: number,
    id: number,
    data: Partial<QcItemsRelease>,
  ): Promise<QcItemsRelease> {
    const record = await this.findOrFail(this.itemsReleaseRepo, companyId, id, "Items release");
    Object.assign(record, data);
    return this.itemsReleaseRepo.save(record);
  }

  async deleteItemsRelease(companyId: number, id: number): Promise<void> {
    const record = await this.findOrFail(this.itemsReleaseRepo, companyId, id, "Items release");
    await this.itemsReleaseRepo.remove(record);
  }

  async autoPopulateItemsRelease(
    companyId: number,
    jobCardId: number,
    user: UserContext,
  ): Promise<QcItemsRelease> {
    const lineItems = await this.workItemProvider.lineItemsForWorkItem(companyId, jobCardId);

    if (lineItems.length === 0) {
      throw new NotFoundException(`Work item #${jobCardId} not found or has no line items`);
    }

    const items: ReleaseLineItem[] = lineItems.map((li) => ({
      itemCode: li.itemCode,
      description: li.description,
      jtNumber: li.jtNumber,
      rubberSpec: null,
      paintingSpec: null,
      quantity: li.quantity,
      result: ItemReleaseResult.PASS,
    }));

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const record = this.itemsReleaseRepo.create({
      companyId,
      jobCardId,
      items,
      totalQuantity,
      createdByName: user.name,
      createdById: user.id,
      plsSignOff: { name: null, date: null, signatureUrl: null },
      mpsSignOff: { name: null, date: null, signatureUrl: null },
      clientSignOff: { name: null, date: null, signatureUrl: null },
    });

    return this.itemsReleaseRepo.save(record);
  }

  async autoGenerateReleaseDocuments(
    companyId: number,
    jobCardId: number,
    selectedItemIndices: number[],
    user: UserContext,
    quantityOverrides?: Record<string, number>,
  ): Promise<{ itemsRelease: QcItemsRelease; releaseCertificate: QcReleaseCertificate }> {
    const lineItems = await this.workItemProvider.lineItemsForWorkItem(companyId, jobCardId);

    if (lineItems.length === 0) {
      throw new NotFoundException(`Work item #${jobCardId} not found or has no line items`);
    }

    const selectedItems: ReleaseLineItem[] = lineItems
      .filter((_li, idx) => selectedItemIndices.includes(idx))
      .map((li, _mapIdx, _arr) => {
        const originalIdx = lineItems.indexOf(li);
        const overrideQty = quantityOverrides ? quantityOverrides[String(originalIdx)] : null;
        return {
          itemCode: li.itemCode,
          description: li.description,
          jtNumber: li.jtNumber,
          rubberSpec: null,
          paintingSpec: null,
          quantity: overrideQty !== null && overrideQty !== undefined ? overrideQty : li.quantity,
          result: ItemReleaseResult.PASS,
        };
      });

    if (selectedItems.length === 0) {
      throw new NotFoundException("No line items matched the selected indices");
    }

    const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    const itemsRelease = await this.itemsReleaseRepo.save(
      this.itemsReleaseRepo.create({
        companyId,
        jobCardId,
        items: selectedItems,
        totalQuantity,
        createdByName: user.name,
        createdById: user.id,
        plsSignOff: { name: null, date: null, signatureUrl: null },
        mpsSignOff: { name: null, date: null, signatureUrl: null },
        clientSignOff: { name: null, date: null, signatureUrl: null },
      }),
    );

    const qcData = await this.allMeasurementsForJobCard(companyId, jobCardId);

    const blastProfile = qcData.blastProfiles[0] || null;
    const blastingCheck: BlastingCheck | null = blastProfile
      ? {
          blastProfileBatchNo: blastProfile.abrasiveBatchNumber,
          contaminationFree: QcCheckResult.PASS,
          sa25Grade: QcCheckResult.PASS,
          inspectorName: blastProfile.capturedByName,
        }
      : null;

    const paintingChecks: PaintingCheck[] = qcData.dftReadings.map((dft) => {
      const inSpec =
        dft.averageMicrons !== null &&
        dft.averageMicrons >= dft.specMinMicrons &&
        dft.averageMicrons <= dft.specMaxMicrons;
      return {
        coat: dft.coatType as "primer" | "intermediate" | "final",
        batchNumber: dft.batchNumber,
        dftMicrons: dft.averageMicrons,
        result: inSpec ? QcCheckResult.PASS : QcCheckResult.FAIL,
        inspectorName: dft.capturedByName,
      };
    });

    const shoreHardnessRecord = qcData.shoreHardness[0] || null;
    const dustDebrisRecord = qcData.dustDebrisTests[0] || null;

    const finalInspection: FinalInspection = {
      linedAsPerDrawing: null,
      visualInspection: dustDebrisRecord ? QcCheckResult.PASS : null,
      testPlate: null,
      shoreHardness: shoreHardnessRecord?.averages?.overall ?? null,
      sparkTest: null,
      sparkTestVoltagePerMm: null,
      inspectorName:
        shoreHardnessRecord?.capturedByName || dustDebrisRecord?.capturedByName || null,
    };

    const releaseCertificate = await this.releaseCertRepo.save(
      this.releaseCertRepo.create({
        companyId,
        jobCardId,
        blastingCheck,
        paintingChecks,
        finalInspection,
        solutionsUsed: [],
        cureCycles: [],
        capturedByName: user.name,
        capturedById: user.id,
      }),
    );

    return { itemsRelease, releaseCertificate };
  }

  // ── Aggregate ──────────────────────────────────────────────────────

  async allMeasurementsForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<{
    shoreHardness: QcShoreHardness[];
    dftReadings: QcDftReading[];
    blastProfiles: QcBlastProfile[];
    dustDebrisTests: QcDustDebrisTest[];
    pullTests: QcPullTest[];
    controlPlans: QcControlPlan[];
    releaseCertificates: QcReleaseCertificate[];
  }> {
    const [
      shoreHardness,
      dftReadings,
      blastProfiles,
      dustDebrisTests,
      pullTests,
      controlPlans,
      releaseCertificates,
    ] = await Promise.all([
      this.shoreHardnessForJobCard(companyId, jobCardId),
      this.dftReadingsForJobCard(companyId, jobCardId),
      this.blastProfilesForJobCard(companyId, jobCardId),
      this.dustDebrisTestsForJobCard(companyId, jobCardId),
      this.pullTestsForJobCard(companyId, jobCardId),
      this.controlPlansForJobCard(companyId, jobCardId),
      this.releaseCertificatesForJobCard(companyId, jobCardId),
    ]);

    return {
      shoreHardness,
      dftReadings,
      blastProfiles,
      dustDebrisTests,
      pullTests,
      controlPlans,
      releaseCertificates,
    };
  }

  // ── Defelsko Batches ───────────────────────────────────────────────

  async defelskoBatchesForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<QcDefelskoBatch[]> {
    return this.defelskoBatchRepo.find({
      where: { companyId, jobCardId },
      order: { category: "ASC", fieldKey: "ASC" },
    });
  }

  async saveDefelskoBatches(
    companyId: number,
    jobCardId: number,
    data: {
      batches: Array<{
        fieldKey: string;
        category: string;
        label: string;
        batchNumber: string | null;
        notApplicable: boolean;
      }>;
    },
    user: UserContext,
  ): Promise<QcDefelskoBatch[]> {
    const results = await Promise.all(
      data.batches.map(async (entry) => {
        const existing = await this.defelskoBatchRepo.findOne({
          where: { companyId, jobCardId, fieldKey: entry.fieldKey },
        });

        if (existing) {
          existing.batchNumber = entry.batchNumber;
          existing.notApplicable = entry.notApplicable;
          existing.label = entry.label;
          existing.category = entry.category;
          return this.defelskoBatchRepo.save(existing);
        }

        return this.defelskoBatchRepo.save(
          this.defelskoBatchRepo.create({
            companyId,
            jobCardId,
            fieldKey: entry.fieldKey,
            category: entry.category,
            label: entry.label,
            batchNumber: entry.batchNumber,
            notApplicable: entry.notApplicable,
            capturedByName: user.name,
            capturedById: user.id,
          }),
        );
      }),
    );

    return results;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private async findOrFail<T extends QcEntity>(
    repo: Repository<T>,
    companyId: number,
    id: number,
    label: string,
  ): Promise<T> {
    const record = await repo.findOne({ where: { id, companyId } as any });

    if (!record) {
      throw new NotFoundException(`${label} #${id} not found`);
    }

    return record;
  }
}
