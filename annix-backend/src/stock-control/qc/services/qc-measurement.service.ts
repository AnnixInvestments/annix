import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobCardCoatingAnalysis } from "../../entities/coating-analysis.entity";
import { JobCard } from "../../entities/job-card.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";
import { INVALID_LINE_ITEM_PATTERNS, stripJunkSuffixes } from "../../lib/line-item-validation";
import { QcBlastProfile } from "../entities/qc-blast-profile.entity";
import {
  InterventionType,
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

  async allControlPlans(companyId: number, search: string | null): Promise<QcControlPlan[]> {
    const qb = this.controlPlanRepo
      .createQueryBuilder("qcp")
      .where("qcp.company_id = :companyId", { companyId })
      .orderBy("qcp.created_at", "DESC");

    if (search) {
      qb.andWhere("(qcp.qcp_number ILIKE :search OR qcp.job_number ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    return qb.getMany();
  }

  async controlPlanById(companyId: number, id: number): Promise<QcControlPlan> {
    return this.findOrFail(this.controlPlanRepo, companyId, id, "Control plan");
  }

  private async nextQcpNumber(companyId: number, planType: QcpPlanType): Promise<string> {
    const isPaint =
      planType === QcpPlanType.PAINT_EXTERNAL || planType === QcpPlanType.PAINT_INTERNAL;
    const prefix = isPaint ? "QCP-P" : "QCP-R";
    const startNumber = 10001;

    const result = await this.controlPlanRepo
      .createQueryBuilder("qcp")
      .select("qcp.qcp_number", "qcpNumber")
      .where("qcp.company_id = :companyId", { companyId })
      .andWhere("qcp.qcp_number LIKE :prefix", { prefix: `${prefix}%` })
      .orderBy("qcp.qcp_number", "DESC")
      .limit(1)
      .getRawOne();

    if (result?.qcpNumber) {
      const numPart = parseInt(result.qcpNumber.replace(prefix, ""), 10);
      if (!Number.isNaN(numPart)) {
        return `${prefix}${numPart + 1}`;
      }
    }

    return `${prefix}${startNumber}`;
  }

  async createControlPlan(
    companyId: number,
    jobCardId: number,
    data: Partial<QcControlPlan>,
    user: UserContext,
  ): Promise<QcControlPlan> {
    const planType = data.planType || QcpPlanType.PAINT_EXTERNAL;
    const qcpNumber = await this.nextQcpNumber(companyId, planType);
    const planTypeDocRefs: Record<string, string> = {
      [QcpPlanType.PAINT_EXTERNAL]: "QD_PLS_11",
      [QcpPlanType.PAINT_INTERNAL]: "QD_PLS_11",
      [QcpPlanType.RUBBER]: "QD_PLS_07",
      [QcpPlanType.HDPE]: "QD_PLS_07",
    };
    const record = this.controlPlanRepo.create({
      ...data,
      companyId,
      jobCardId,
      qcpNumber,
      documentRef: planTypeDocRefs[planType] || null,
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

    const existingByType = existing.reduce(
      (acc, plan) => ({ ...acc, [plan.planType]: plan }),
      {} as Record<string, QcControlPlan>,
    );

    const customerName = jobCard.customerName || null;
    const orderNumber = jobCard.poNumber || null;
    const jobNumber = jobCard.jobNumber || null;
    const jobName = (jobCard.jobName || "").trim() || null;
    const itemDescriptions = (jobCard.lineItems || [])
      .map((li: any) => stripJunkSuffixes((li.itemDescription || "").trim()))
      .filter(
        (desc: string) =>
          desc.length > 0 && !INVALID_LINE_ITEM_PATTERNS.some((pattern) => pattern.test(desc)),
      )
      .join("; ");

    const emptySignOff = (): PartySignOff => ({
      interventionType: null,
      initial: null,
      name: null,
      signatureUrl: null,
      date: null,
    });

    const holdSignOff = (): PartySignOff => ({
      interventionType: InterventionType.HOLD,
      initial: null,
      name: null,
      signatureUrl: null,
      date: null,
    });

    const defaultApprovals = (): QcpApprovalSignature[] => [
      { party: "PLS", name: null, signatureUrl: null, date: null },
      { party: "MPS", name: null, signatureUrl: null, date: null },
      { party: "Client", name: null, signatureUrl: null, date: null },
      { party: "3rd Party", name: null, signatureUrl: null, date: null },
    ];

    const buildActivity = (
      opNum: number,
      description: string,
      spec: string | null,
      doc: string | null,
      pls?: PartySignOff,
      mps?: PartySignOff,
      client?: PartySignOff,
      thirdParty?: PartySignOff,
    ): QcpActivity => ({
      operationNumber: opNum,
      description,
      specification: spec,
      procedureRequired: null,
      documentation: doc,
      pls: pls || holdSignOff(),
      mps: mps || emptySignOff(),
      client: client || emptySignOff(),
      thirdParty: thirdParty || emptySignOff(),
      remarks: null,
    });

    const extractSpecByArea = (notes: string | null | undefined, area: "INT" | "EXT"): string => {
      if (!notes) return "TBC";
      const parts = notes
        .split(/(?=\bINT\s*:|EXT\s*:)/i)
        .filter((p) => p.trim().toUpperCase().startsWith(`${area}`))
        .map((p) => stripJunkSuffixes(p.trim()));
      return parts.length > 0 ? [...new Set(parts)].join(" ") : "TBC";
    };

    const blastSpecLabel = (surfPrep: string | null): string => {
      const labels: Record<string, string> = {
        sa3_blast: "SA3 BLAST ISO 8501-1",
        sa2_5_blast: "SA2.5 BLAST ISO 8501-1",
        sa2_blast: "SA2 BLAST ISO 8501-1",
        sa1_blast: "SA1 BLAST ISO 8501-1",
        blast: "BLAST ISO 8501-1",
        hand_tool: "HAND TOOL PREP ST3",
        power_tool: "POWER TOOL PREP ST3",
      };
      return (surfPrep && labels[surfPrep]) || surfPrep || "SA2.5 BLAST ISO 8501-1";
    };

    const rubberActivities = (): QcpActivity[] => {
      const rubberSpec = extractSpecByArea(coating?.rawNotes, "INT");
      const intSurfPrep = coating?.intSurfacePrep || coating?.surfacePrep || "sa3_blast";
      return [
        buildActivity(1, "Obtain Approval of QCP", null, "QC Document"),
        buildActivity(2, "Check Cleanliness", "SANS 1201-2005", "QD_PLS_16"),
        buildActivity(3, "Blasting", blastSpecLabel(intSurfPrep), "RECORD READINGS"),
        buildActivity(4, "Hero Bond 080", "CERTIFICATE OF ANALYSIS", "QD_PLS_16"),
        buildActivity(5, "Hero Bond 082", "CERTIFICATE OF ANALYSIS", "QD_PLS_16"),
        buildActivity(6, "TY Bond 086", "CERTIFICATE OF ANALYSIS", "QD_PLS_16"),
        buildActivity(7, "Rubber Lining Application", rubberSpec, "QD_PLS_16"),
        buildActivity(8, "Pre cure Inspection", "SANS 1201-2005", "QD_PLS_16"),
        buildActivity(9, "Cure", "SANS 1201-2005", "QD_PLS_16"),
        buildActivity(10, "Buff", "SANS 1201-2005", "QD_PLS_16"),
        buildActivity(11, "Spark Test", "SANS 1201-2005", "QD_PLS_16"),
        buildActivity(12, "Hardness", "SANS 1201-2005", "Data Records"),
        buildActivity(13, "Test plate Results", "SANS 1201-2005", "QD_PLS_16"),
        buildActivity(14, "Final Inspection", "SANS 1201-2005", "QD_PLS_16"),
        buildActivity(15, "Humidity Documents", "SANS 1201-2005", "Data Records"),
        buildActivity(16, "Databook sign off", null, "Data Book"),
      ];
    };

    const paintActivities = (paintCoats: any[], surfPrep: string | null): QcpActivity[] => {
      const activities: QcpActivity[] = [
        buildActivity(1, "Approval of QCP", null, "QD_PLS_11"),
        buildActivity(2, "Weather Conditions", "HUMIDITY: less than 85%", "QD_PLS_10"),
        buildActivity(
          3,
          "Calibration Certificates",
          "CALIBRATION CERTIFICATES",
          "CALIBRATION CERTIFICATES",
        ),
        buildActivity(4, "Verification of Paints Used", "BATCH CERTIFICATES", "BATCH CERTIFICATES"),
        buildActivity(5, "Visual Inspection on Items", "QD_PLS_16", "QD_PLS_16"),
        buildActivity(
          6,
          surfPrep === "no_blasting" ? "Surface Preparation" : "Blasting",
          surfPrep === "no_blasting" ? "NO BLASTING" : blastSpecLabel(surfPrep),
          surfPrep === "no_blasting" ? "N/A" : "RECORD READINGS",
        ),
      ];

      let opNum = 7;
      let totalMinDft = 0;
      let totalMaxDft = 0;

      const hasBothAreas =
        paintCoats.some((c: any) => c.area === "external") &&
        paintCoats.some((c: any) => c.area === "internal");

      paintCoats.forEach((coat: any) => {
        const dftSpec =
          coat.minDftUm && coat.maxDftUm
            ? Number(coat.minDftUm) === Number(coat.maxDftUm)
              ? `${coat.minDftUm}µm`
              : `${coat.minDftUm}-${coat.maxDftUm}µm`
            : coat.minDftUm
              ? `${coat.minDftUm}µm`
              : coat.maxDftUm
                ? `${coat.maxDftUm}µm`
                : null;
        if (coat.minDftUm) totalMinDft += Number(coat.minDftUm);
        if (coat.maxDftUm) totalMaxDft += Number(coat.maxDftUm);
        const areaPrefix = hasBothAreas ? (coat.area === "internal" ? "INT: " : "EXT: ") : "";
        const coatName = `${areaPrefix}${coat.product || "TBC"}`;
        activities.push(buildActivity(opNum++, coatName, dftSpec, "RECORD READINGS"));
      });

      if (paintCoats.length === 0) {
        activities.push(buildActivity(opNum++, "Primer Coat", null, "RECORD READINGS"));
        activities.push(buildActivity(opNum++, "Topcoat", null, "RECORD READINGS"));
      }

      const totalDftSpec =
        totalMinDft > 0 || totalMaxDft > 0
          ? totalMinDft === totalMaxDft
            ? `${totalMinDft}µm`
            : `${totalMinDft}-${totalMaxDft}µm`
          : null;

      activities.push(buildActivity(opNum++, "Total DFTs", totalDftSpec, "RECORD READINGS"));
      activities.push(
        buildActivity(opNum++, "Final Release", "CLIENT INSPECTION", "CLIENT RELEASE"),
      );
      activities.push(buildActivity(opNum++, "Data Book Inspection", "REVIEW DATA", "REVIEW DATA"));

      return activities;
    };

    const activitiesForType = (planType: QcpPlanType): QcpActivity[] => {
      if (planType === QcpPlanType.PAINT_EXTERNAL || planType === QcpPlanType.PAINT_INTERNAL) {
        return paintActivities(coats, coating?.extSurfacePrep || coating?.surfacePrep || null);
      }
      if (planType === QcpPlanType.RUBBER) {
        return rubberActivities();
      }
      return paintActivities([], coating?.surfacePrep || null);
    };

    const specificationForType = (planType: QcpPlanType): string | null => {
      if (planType === QcpPlanType.RUBBER) {
        return extractSpecByArea(coating?.rawNotes, "INT") || coating?.rawNotes || null;
      }
      if (planType === QcpPlanType.PAINT_EXTERNAL || planType === QcpPlanType.PAINT_INTERNAL) {
        return extractSpecByArea(coating?.rawNotes, "EXT") || coating?.rawNotes || null;
      }
      return coating?.rawNotes || null;
    };

    const nextRevision = (current: string | null): string => {
      const num = parseInt(current || "0", 10);
      return String(num + 1).padStart(2, "0");
    };

    const planTypeDocRefs: Record<string, string> = {
      [QcpPlanType.PAINT_EXTERNAL]: "QD_PLS_11",
      [QcpPlanType.PAINT_INTERNAL]: "QD_PLS_11",
      [QcpPlanType.RUBBER]: "QD_PLS_07",
      [QcpPlanType.HDPE]: "QD_PLS_07",
    };

    const created: QcControlPlan[] = [];
    for (const planType of planTypes) {
      const existingPlan = existingByType[planType] || null;
      const revision = existingPlan ? nextRevision(existingPlan.revision) : "01";
      const documentRef = planTypeDocRefs[planType] || null;

      if (existingPlan) {
        const keepExistingNumber = existingPlan.qcpNumber?.startsWith("QCP-");
        existingPlan.qcpNumber = keepExistingNumber
          ? existingPlan.qcpNumber
          : await this.nextQcpNumber(companyId, planType);
        existingPlan.revision = revision;
        existingPlan.documentRef = documentRef;
        existingPlan.customerName = customerName;
        existingPlan.orderNumber = orderNumber;
        existingPlan.jobNumber = jobNumber;
        existingPlan.jobName = jobName;
        existingPlan.specification = specificationForType(planType);
        existingPlan.itemDescription = itemDescriptions || null;
        existingPlan.activities = activitiesForType(planType);
        existingPlan.approvalSignatures = defaultApprovals();
        created.push(await this.controlPlanRepo.save(existingPlan));
      } else {
        const qcpNumber = await this.nextQcpNumber(companyId, planType);
        const record = this.controlPlanRepo.create({
          companyId,
          jobCardId,
          planType,
          qcpNumber,
          documentRef,
          revision,
          customerName,
          orderNumber,
          jobNumber,
          jobName,
          specification: specificationForType(planType),
          itemDescription: itemDescriptions || null,
          activities: activitiesForType(planType),
          approvalSignatures: defaultApprovals(),
          createdByName: user.name,
          createdById: user.id,
        });
        created.push(await this.controlPlanRepo.save(record));
      }
    }

    this.logger.log(
      `Auto-generated ${created.length} QCP(s) for job card ${jobCardId}: ${planTypes.join(", ")}`,
    );

    return created;
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

    const existingReleases = await this.itemsReleasesForJobCard(companyId, jobCardId);

    const alreadyReleasedByItemCode = existingReleases.reduce(
      (acc, release) => {
        return release.items.reduce((inner, ri) => {
          const current = inner[ri.itemCode] || 0;
          return { ...inner, [ri.itemCode]: current + (ri.quantity || 0) };
        }, acc);
      },
      {} as Record<string, number>,
    );

    const selectedItems: ReleaseLineItem[] = lineItems
      .filter((_li, idx) => selectedItemIndices.includes(idx))
      .map((li, _mapIdx, _arr) => {
        const originalIdx = lineItems.indexOf(li);
        const overrideQty = quantityOverrides ? quantityOverrides[String(originalIdx)] : null;
        const requestedQty =
          overrideQty !== null && overrideQty !== undefined ? overrideQty : li.quantity;
        const alreadyReleased = alreadyReleasedByItemCode[li.itemCode] || 0;
        const remaining = Math.max(0, li.quantity - alreadyReleased);

        if (requestedQty > remaining) {
          throw new BadRequestException(
            `Cannot release ${requestedQty} of "${li.itemCode}" — only ${remaining} remaining (${alreadyReleased} already released of ${li.quantity} total)`,
          );
        }

        return {
          itemCode: li.itemCode,
          description: li.description,
          jtNumber: li.jtNumber,
          rubberSpec: null,
          paintingSpec: null,
          quantity: requestedQty,
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
