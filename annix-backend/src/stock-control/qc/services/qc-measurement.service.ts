import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { JobCardCoatingAnalysis } from "../../entities/coating-analysis.entity";
import { INVALID_LINE_ITEM_PATTERNS, stripJunkSuffixes } from "../../lib/line-item-validation";
import { JobCardCoatingAnalysisRepository } from "../../repositories/coating-analysis.repository";
import { CustomerPurchaseOrderRepository } from "../../repositories/customer-purchase-order.repository";
import { JobCardRepository } from "../../repositories/job-card.repository";
import { JobCardLineItemRepository } from "../../repositories/job-card-line-item.repository";
import { StockControlCompanyRepository } from "../../repositories/stock-control-company.repository";
import { CertificateService } from "../../services/certificate.service";
import { sanitizeNotes } from "../../services/job-card-import.service";
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
import { QcEnvironmentalRecord } from "../entities/qc-environmental-record.entity";
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
import { QcBlastProfileRepository } from "../repositories/qc-blast-profile.repository";
import { QcControlPlanRepository } from "../repositories/qc-control-plan.repository";
import { QcDefelskoBatchRepository } from "../repositories/qc-defelsko-batch.repository";
import { QcDftReadingRepository } from "../repositories/qc-dft-reading.repository";
import { QcDustDebrisTestRepository } from "../repositories/qc-dust-debris-test.repository";
import { QcEnvironmentalRecordRepository } from "../repositories/qc-environmental-record.repository";
import { QcItemsReleaseRepository } from "../repositories/qc-items-release.repository";
import { QcPullTestRepository } from "../repositories/qc-pull-test.repository";
import { QcReleaseCertificateRepository } from "../repositories/qc-release-certificate.repository";
import { QcShoreHardnessRepository } from "../repositories/qc-shore-hardness.repository";
import { type IWorkItemProvider, WORK_ITEM_PROVIDER } from "../work-item-provider.interface";

interface CompanyScopedRepository<T> {
  findByIdForCompany(companyId: number, id: number): Promise<T | null>;
}

type QcEntity =
  | QcShoreHardness
  | QcDftReading
  | QcBlastProfile
  | QcDustDebrisTest
  | QcPullTest
  | QcControlPlan
  | QcReleaseCertificate
  | QcItemsRelease
  | QcEnvironmentalRecord;

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

@Injectable()
export class QcMeasurementService {
  private readonly logger = new Logger(QcMeasurementService.name);

  constructor(
    private readonly shoreHardnessRepo: QcShoreHardnessRepository,
    private readonly dftReadingRepo: QcDftReadingRepository,
    private readonly blastProfileRepo: QcBlastProfileRepository,
    private readonly dustDebrisRepo: QcDustDebrisTestRepository,
    private readonly pullTestRepo: QcPullTestRepository,
    private readonly controlPlanRepo: QcControlPlanRepository,
    private readonly releaseCertRepo: QcReleaseCertificateRepository,
    private readonly itemsReleaseRepo: QcItemsReleaseRepository,
    private readonly defelskoBatchRepo: QcDefelskoBatchRepository,
    private readonly envRecordRepo: QcEnvironmentalRecordRepository,
    private readonly jobCardRepo: JobCardRepository,
    private readonly lineItemRepo: JobCardLineItemRepository,
    private readonly coatingRepo: JobCardCoatingAnalysisRepository,
    private readonly companyRepo: StockControlCompanyRepository,
    private readonly cpoRepo: CustomerPurchaseOrderRepository,
    @Inject(WORK_ITEM_PROVIDER)
    private readonly workItemProvider: IWorkItemProvider,
    @Inject(forwardRef(() => CertificateService))
    private readonly certificateService: CertificateService,
  ) {}

  // ── Shore Hardness ──────────────────────────────────────────────────

  async shoreHardnessForJobCard(companyId: number, jobCardId: number): Promise<QcShoreHardness[]> {
    return this.shoreHardnessRepo.findForJobCard(companyId, jobCardId);
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
    return this.shoreHardnessRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
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
    return this.dftReadingRepo.findForJobCard(companyId, jobCardId);
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
    return this.dftReadingRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
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
    return this.blastProfileRepo.findForJobCard(companyId, jobCardId);
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
    return this.blastProfileRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
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
    return this.dustDebrisRepo.findForJobCard(companyId, jobCardId);
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
    return this.dustDebrisRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
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
    return this.pullTestRepo.findForJobCard(companyId, jobCardId);
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
    return this.pullTestRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
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
    const plans = await this.controlPlanRepo.findForJobCard(companyId, jobCardId);

    const missingSpec = plans.filter(
      (p) => !p.specification || p.specification.trim().length === 0,
    );
    if (missingSpec.length === 0) {
      return plans;
    }

    const [jobCard, coating] = await Promise.all([
      this.jobCardRepo.findOneForCompany(jobCardId, companyId),
      this.coatingRepo.findOneForJobCard(companyId, jobCardId),
    ]);

    const effectiveRawNotes = coating?.rawNotes || sanitizeNotes(jobCard?.notes) || null;
    if (!effectiveRawNotes) {
      return plans;
    }

    const backfilled = await Promise.all(
      missingSpec.map(async (plan) => {
        const spec = this.specForPlanType(plan.planType, effectiveRawNotes);
        if (!spec) return plan;
        plan.specification = spec;
        return this.controlPlanRepo.save(plan);
      }),
    );

    const backfilledById = backfilled.reduce<Record<number, QcControlPlan>>(
      (acc, plan) => ({ ...acc, [plan.id]: plan }),
      {},
    );

    return plans.map((p) => backfilledById[p.id] || p);
  }

  private specForPlanType(planType: QcpPlanType, rawNotes: string | null): string | null {
    if (!rawNotes) return null;
    const extract = (area: "INT" | "EXT"): string => {
      const parts = rawNotes
        .split(/(?=\bINT\s*:|EXT\s*:)/i)
        .filter((p) => p.trim().toUpperCase().startsWith(area))
        .map((p) => stripJunkSuffixes(p.trim()));
      return parts.length > 0 ? [...new Set(parts)].join(" ") : "";
    };

    if (planType === QcpPlanType.RUBBER) {
      return extract("INT") || rawNotes;
    }
    if (planType === QcpPlanType.PAINT_EXTERNAL || planType === QcpPlanType.PAINT_INTERNAL) {
      return extract("EXT") || rawNotes;
    }
    return rawNotes;
  }

  async allControlPlans(companyId: number, search: string | null): Promise<QcControlPlan[]> {
    return this.controlPlanRepo.search(companyId, search);
  }

  async controlPlanById(companyId: number, id: number): Promise<QcControlPlan> {
    return this.findOrFail(this.controlPlanRepo, companyId, id, "Control plan");
  }

  private async nextQcpNumber(companyId: number, planType: QcpPlanType): Promise<string> {
    const isPaint =
      planType === QcpPlanType.PAINT_EXTERNAL || planType === QcpPlanType.PAINT_INTERNAL;
    const prefix = isPaint ? "QCP-P" : "QCP-R";
    const startNumber = 10001;

    const latestQcpNumber = await this.controlPlanRepo.latestQcpNumberWithPrefix(companyId, prefix);

    if (latestQcpNumber) {
      const numPart = parseInt(latestQcpNumber.replace(prefix, ""), 10);
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
    return this.controlPlanRepo.create({
      ...data,
      companyId,
      jobCardId,
      qcpNumber,
      documentRef: planTypeDocRefs[planType] || null,
      createdByName: user.name,
      createdById: user.id,
    });
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
      this.jobCardRepo.findOneForCompanyWithLineItems(jobCardId, companyId),
      this.coatingRepo.findOneForJobCard(companyId, jobCardId),
      this.companyRepo.findById(companyId),
    ]);

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    const existing = await this.controlPlanRepo.findForJobCard(companyId, jobCardId);

    const coats = Array.isArray(coating?.coats) ? coating.coats : [];
    const effectiveRawNotes = coating?.rawNotes || sanitizeNotes(jobCard.notes) || null;
    const notesHasExt = effectiveRawNotes ? /\bEXT\s*:/i.test(effectiveRawNotes) : false;
    const notesHasInt = effectiveRawNotes ? /\bINT\s*:/i.test(effectiveRawNotes) : false;
    const notesHasRubber = effectiveRawNotes
      ? /\bR\/L\b|\brubber\b|\blining\b|\blagging\b|\bROT\b/i.test(effectiveRawNotes)
      : false;
    const hasRubber = coating?.hasInternalLining === true || notesHasRubber;
    const hasPaint = coats.length > 0 || notesHasExt || notesHasInt;
    const hasExternalPaint = coats.some((c: any) => c.area === "external") || notesHasExt;
    const hasInternalPaint =
      coats.some((c: any) => c.area === "internal") || (notesHasInt && !notesHasRubber);

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
      const rubberSpec = extractSpecByArea(effectiveRawNotes, "INT");
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
        return extractSpecByArea(effectiveRawNotes, "INT") || effectiveRawNotes || null;
      }
      if (planType === QcpPlanType.PAINT_EXTERNAL || planType === QcpPlanType.PAINT_INTERNAL) {
        return extractSpecByArea(effectiveRawNotes, "EXT") || effectiveRawNotes || null;
      }
      return effectiveRawNotes || null;
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
        created.push(
          await this.controlPlanRepo.create({
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
          }),
        );
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
    return this.releaseCertRepo.findForJobCard(companyId, jobCardId);
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
    return this.releaseCertRepo.create({
      ...data,
      companyId,
      jobCardId,
      capturedByName: user.name,
      capturedById: user.id,
    });
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
    return this.itemsReleaseRepo.findForJobCard(companyId, jobCardId);
  }

  async itemsReleaseById(companyId: number, id: number): Promise<QcItemsRelease> {
    return this.findOrFail(this.itemsReleaseRepo, companyId, id, "Items release");
  }

  private async validateReleaseQuantities(
    companyId: number,
    jobCardId: number,
    newItems: Array<{ itemCode: string; quantity: number }>,
    excludeReleaseId?: number,
  ): Promise<void> {
    const lineItems = await this.lineItemRepo.findForJobCardAndCompany(jobCardId, companyId);
    const existingReleases = await this.itemsReleaseRepo.findAllForJobCard(jobCardId, companyId);

    const alreadyReleased: Record<string, number> = {};
    for (const release of existingReleases) {
      if (excludeReleaseId && release.id === excludeReleaseId) continue;
      const items = (release.items || []) as Array<{ itemCode: string; quantity: number }>;
      for (const item of items) {
        const key = item.itemCode;
        const prev = alreadyReleased[key];
        alreadyReleased[key] = (prev || 0) + Number(item.quantity);
      }
    }

    for (const item of newItems) {
      const key = item.itemCode;
      const lineItem = lineItems.find((li) => li.itemCode === key);
      const maxQty = lineItem ? Number(lineItem.quantity) : 0;
      const prev = alreadyReleased[key];
      const alreadyQty = prev || 0;
      const totalAfter = alreadyQty + Number(item.quantity);
      if (totalAfter > maxQty) {
        throw new BadRequestException(
          `Cannot release ${item.quantity} of "${key}" — already released ${alreadyQty} of ${maxQty} available`,
        );
      }
    }
  }

  async createItemsRelease(
    companyId: number,
    jobCardId: number,
    data: Partial<QcItemsRelease>,
    user: UserContext,
  ): Promise<QcItemsRelease> {
    if (data.items && Array.isArray(data.items)) {
      await this.validateReleaseQuantities(
        companyId,
        jobCardId,
        data.items as Array<{ itemCode: string; quantity: number }>,
      );
    }
    return this.itemsReleaseRepo.create({
      ...data,
      companyId,
      jobCardId,
      createdByName: user.name,
      createdById: user.id,
    });
  }

  async updateItemsRelease(
    companyId: number,
    id: number,
    data: Partial<QcItemsRelease>,
  ): Promise<QcItemsRelease> {
    const record = await this.findOrFail(this.itemsReleaseRepo, companyId, id, "Items release");
    const itemsChanged =
      data.items !== undefined && JSON.stringify(data.items) !== JSON.stringify(record.items);
    if (itemsChanged && data.items && Array.isArray(data.items)) {
      const jcId = record.jobCardId;
      if (jcId) {
        await this.validateReleaseQuantities(
          companyId,
          jcId,
          data.items as Array<{ itemCode: string; quantity: number }>,
          id,
        );
      }
    }
    Object.assign(record, data);
    if (itemsChanged) {
      record.version = (record.version || 1) + 1;
    }
    return this.itemsReleaseRepo.save(record);
  }

  async deleteItemsRelease(companyId: number, id: number): Promise<void> {
    const record = await this.findOrFail(this.itemsReleaseRepo, companyId, id, "Items release");
    await this.itemsReleaseRepo.remove(record);
  }

  async deleteCpoItemsRelease(companyId: number, id: number): Promise<void> {
    const cpoRelease = await this.findOrFail(
      this.itemsReleaseRepo,
      companyId,
      id,
      "CPO items release",
    );
    if (!cpoRelease.cpoId) {
      await this.itemsReleaseRepo.remove(cpoRelease);
      return;
    }

    const createdAt = cpoRelease.createdAt;
    const windowStart = new Date(createdAt.getTime() - 5000);
    const windowEnd = new Date(createdAt.getTime() + 5000);

    const childReleases = await this.itemsReleaseRepo.findChildReleasesInWindow(
      companyId,
      windowStart,
      windowEnd,
      cpoRelease.createdById,
    );

    if (childReleases.length > 0) {
      await this.itemsReleaseRepo.removeMany(childReleases);
    }
    await this.itemsReleaseRepo.remove(cpoRelease);
  }

  private async coatingSpecsForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<{ rubberSpec: string | null; paintingSpec: string | null }> {
    const coating = await this.coatingRepo.findOneForJobCard(companyId, jobCardId);
    if (!coating) {
      return { rubberSpec: null, paintingSpec: null };
    }

    const rubberSpec = coating.hasInternalLining ? this.extractRubberSpec(coating) : null;

    const paintingSpec = (coating.coats || []).length > 0 ? this.extractPaintSpec(coating) : null;

    return { rubberSpec, paintingSpec };
  }

  private extractRubberSpec(coating: JobCardCoatingAnalysis): string {
    if (coating.rawNotes) {
      const intParts = coating.rawNotes
        .split(/(?=\bINT\s*:)/i)
        .filter((p) => p.trim().toUpperCase().startsWith("INT"))
        .map((p) => p.trim());
      if (intParts.length > 0) {
        return intParts[0];
      }
    }
    return "Internal Rubber Lining";
  }

  private extractPaintSpec(coating: JobCardCoatingAnalysis): string {
    const coats = coating.coats || [];
    if (coats.length === 0) return "Paint Coating";
    const summary = coats
      .map((c) => {
        const dft =
          c.minDftUm && c.maxDftUm
            ? `${c.minDftUm}-${c.maxDftUm}μm`
            : c.minDftUm
              ? `${c.minDftUm}μm`
              : "";
        return dft ? `${c.product} (${dft})` : c.product;
      })
      .join(", ");
    return summary;
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

    const specs = await this.coatingSpecsForJobCard(companyId, jobCardId);

    const items: ReleaseLineItem[] = lineItems.map((li) => ({
      itemCode: li.itemCode,
      description: li.description,
      jtNumber: li.jtNumber,
      rubberSpec: specs.rubberSpec,
      paintingSpec: specs.paintingSpec,
      quantity: li.quantity,
      result: ItemReleaseResult.PASS,
      itemNo: li.itemNo,
    }));

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    return this.itemsReleaseRepo.create({
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

    const specs = await this.coatingSpecsForJobCard(companyId, jobCardId);

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
          rubberSpec: specs.rubberSpec,
          paintingSpec: specs.paintingSpec,
          quantity: requestedQty,
          result: ItemReleaseResult.PASS,
          itemNo: li.itemNo,
        };
      });

    if (selectedItems.length === 0) {
      throw new NotFoundException("No line items matched the selected indices");
    }

    const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    const itemsRelease = await this.itemsReleaseRepo.create({
      companyId,
      jobCardId,
      items: selectedItems,
      totalQuantity,
      createdByName: user.name,
      createdById: user.id,
      plsSignOff: { name: null, date: null, signatureUrl: null },
      mpsSignOff: { name: null, date: null, signatureUrl: null },
      clientSignOff: { name: null, date: null, signatureUrl: null },
    });

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

    const releaseCertificate = await this.releaseCertRepo.create({
      companyId,
      jobCardId,
      blastingCheck,
      paintingChecks,
      finalInspection,
      solutionsUsed: [],
      cureCycles: [],
      capturedByName: user.name,
      capturedById: user.id,
    });

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
    const perfStart = Date.now();
    const time = async <T>(label: string, p: Promise<T>): Promise<T> => {
      const t0 = Date.now();
      const result = await p;
      this.logger.log(`[perf] allMeasurements.${label} JC=${jobCardId} ${Date.now() - t0}ms`);
      return result;
    };
    const [
      shoreHardness,
      dftReadings,
      blastProfiles,
      dustDebrisTests,
      pullTests,
      controlPlans,
      releaseCertificates,
    ] = await Promise.all([
      time("shoreHardness", this.shoreHardnessForJobCard(companyId, jobCardId)),
      time("dftReadings", this.dftReadingsForJobCard(companyId, jobCardId)),
      time("blastProfiles", this.blastProfilesForJobCard(companyId, jobCardId)),
      time("dustDebrisTests", this.dustDebrisTestsForJobCard(companyId, jobCardId)),
      time("pullTests", this.pullTestsForJobCard(companyId, jobCardId)),
      time("controlPlans", this.controlPlansForJobCard(companyId, jobCardId)),
      time("releaseCertificates", this.releaseCertificatesForJobCard(companyId, jobCardId)),
    ]);
    this.logger.log(
      `[perf] allMeasurementsForJobCard JC=${jobCardId} total=${Date.now() - perfStart}ms`,
    );

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

  // ── Batch Name Auto-Match ────────────────────────────────────────

  async matchBatchName(
    companyId: number,
    batchName: string | null,
  ): Promise<{
    jobCardId: number;
    jobNumber: string | null;
    jcNumber: string | null;
    fieldKey: string;
    category: string;
    coatDetail: {
      product: string;
      minDftUm: number;
      maxDftUm: number;
      coatRole: string | null;
    } | null;
  } | null> {
    if (!batchName) return null;

    const match = await this.defelskoBatchRepo.matchActiveByBatchNumber(companyId, batchName);

    if (!match) return null;

    const entity = match.batch;

    let coatDetail: {
      product: string;
      minDftUm: number;
      maxDftUm: number;
      coatRole: string | null;
    } | null = null;

    if (entity.fieldKey.startsWith("paint_dft_")) {
      const coatIndex = Number.parseInt(entity.fieldKey.replace("paint_dft_", ""), 10);
      const analysis = await this.coatingRepo.findLatestForJobCard(companyId, entity.jobCardId);

      if (analysis?.coats?.[coatIndex]) {
        const coat = analysis.coats[coatIndex];
        coatDetail = {
          product: coat.product,
          minDftUm: coat.minDftUm,
          maxDftUm: coat.maxDftUm,
          coatRole: coat.coatRole || null,
        };
      }
    }

    return {
      jobCardId: entity.jobCardId,
      jobNumber: match.jobNumber,
      jcNumber: match.jcNumber,
      fieldKey: entity.fieldKey,
      category: entity.category,
      coatDetail,
    };
  }

  // ── Defelsko Batches ───────────────────────────────────────────────

  async defelskoBatchesForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<QcDefelskoBatch[]> {
    return this.defelskoBatchRepo.findForJobCard(companyId, jobCardId);
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
        const existing = await this.defelskoBatchRepo.findByJobCardAndFieldKey(
          companyId,
          jobCardId,
          entry.fieldKey,
        );

        if (existing) {
          existing.batchNumber = entry.batchNumber;
          existing.notApplicable = entry.notApplicable;
          existing.label = entry.label;
          existing.category = entry.category;
          return this.defelskoBatchRepo.save(existing);
        }

        return this.defelskoBatchRepo.create({
          companyId,
          jobCardId,
          fieldKey: entry.fieldKey,
          category: entry.category,
          label: entry.label,
          batchNumber: entry.batchNumber,
          notApplicable: entry.notApplicable,
          capturedByName: user.name,
          capturedById: user.id,
        });
      }),
    );

    await Promise.all(
      results.map(async (batch) => {
        const bn = batch.batchNumber;
        if (!bn || batch.notApplicable || batch.supplierCertificateId) return;
        const cert = await this.certificateService.findMatchingCertificate(companyId, bn);
        if (cert) {
          batch.supplierCertificateId = cert.id;
          await this.defelskoBatchRepo.save(batch);
          this.logger.log(`Linked defelsko batch "${bn}" to cert ${cert.id} on save`);
        }
      }),
    );

    return results;
  }

  // ── Cross-Job-Card Queries ───────────────────────────────────────

  async allDftReadings(
    companyId: number,
  ): Promise<(QcDftReading & { jobNumber: string | null; jcNumber: string | null })[]> {
    return this.dftReadingRepo.findAllWithJobInfo(companyId);
  }

  async allBlastProfiles(
    companyId: number,
  ): Promise<(QcBlastProfile & { jobNumber: string | null; jcNumber: string | null })[]> {
    return this.blastProfileRepo.findAllWithJobInfo(companyId);
  }

  async allShoreHardnessRecords(
    companyId: number,
  ): Promise<(QcShoreHardness & { jobNumber: string | null; jcNumber: string | null })[]> {
    return this.shoreHardnessRepo.findAllWithJobInfo(companyId);
  }

  // ── Environmental Records ─────────────────────────────────────────

  async allEnvironmentalRecords(
    companyId: number,
  ): Promise<(QcEnvironmentalRecord & { jobNumber: string | null; jcNumber: string | null })[]> {
    return this.envRecordRepo.findAllWithJobInfo(companyId);
  }

  async environmentalRecordsForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<QcEnvironmentalRecord[]> {
    return this.envRecordRepo.findForJobCardOrdered(companyId, jobCardId);
  }

  async environmentalRecordByDate(
    companyId: number,
    jobCardId: number,
    date: string,
  ): Promise<QcEnvironmentalRecord | null> {
    return this.envRecordRepo.findByJobCardAndDate(companyId, jobCardId, date);
  }

  async createEnvironmentalRecord(
    companyId: number,
    jobCardId: number,
    data: Partial<QcEnvironmentalRecord>,
    user: UserContext,
  ): Promise<QcEnvironmentalRecord> {
    return this.envRecordRepo.create({
      ...data,
      companyId,
      jobCardId,
      recordedByName: user.name,
      recordedById: user.id,
    });
  }

  async updateEnvironmentalRecord(
    companyId: number,
    id: number,
    data: Partial<QcEnvironmentalRecord>,
  ): Promise<QcEnvironmentalRecord> {
    const record = await this.findOrFail(this.envRecordRepo, companyId, id, "Environmental record");
    Object.assign(record, data);
    return this.envRecordRepo.save(record);
  }

  async deleteEnvironmentalRecord(companyId: number, id: number): Promise<void> {
    const record = await this.findOrFail(this.envRecordRepo, companyId, id, "Environmental record");
    await this.envRecordRepo.remove(record);
  }

  async bulkCreateEnvironmentalRecords(
    companyId: number,
    jobCardId: number,
    records: Array<Partial<QcEnvironmentalRecord>>,
    user: UserContext,
  ): Promise<QcEnvironmentalRecord[]> {
    const results: QcEnvironmentalRecord[] = [];
    for (const data of records) {
      const existing = await this.envRecordRepo.findByJobCardAndDate(
        companyId,
        jobCardId,
        data.recordDate,
      );

      if (existing) {
        Object.assign(existing, {
          humidity: data.humidity,
          temperatureC: data.temperatureC,
          dewPointC: data.dewPointC ?? existing.dewPointC,
          notes: data.notes ?? existing.notes,
        });
        results.push(await this.envRecordRepo.save(existing));
      } else {
        results.push(
          await this.envRecordRepo.create({
            ...data,
            companyId,
            jobCardId,
            recordedByName: user.name,
            recordedById: user.id,
          }),
        );
      }
    }
    return results;
  }

  // ── CPO-Level Control Plans ──────────────────────────────────────

  async controlPlansForCpo(companyId: number, cpoId: number): Promise<QcControlPlan[]> {
    const allPlans = await this.controlPlanRepo.findForCpo(companyId, cpoId);
    const seenTypes = new Set<string>();
    return allPlans.filter((plan) => {
      if (seenTypes.has(plan.planType)) return false;
      seenTypes.add(plan.planType);
      return true;
    });
  }

  async autoGenerateControlPlansForCpo(
    companyId: number,
    cpoId: number,
    user: UserContext,
  ): Promise<QcControlPlan[]> {
    const cpo = await this.cpoRepo.findOneForCompanyWithItems(cpoId, companyId);

    if (!cpo) {
      throw new NotFoundException(`CPO ${cpoId} not found`);
    }

    const childJobCards = await this.jobCardRepo.findForCpoWithLineItemsOrdered(cpoId, companyId);

    const firstJcId = childJobCards[0]?.id || null;
    const coating = firstJcId
      ? await this.coatingRepo.findOneForJobCard(companyId, firstJcId)
      : null;

    const existing = await this.controlPlanRepo.findForCpo(companyId, cpoId);

    const coats = Array.isArray(coating?.coats) ? coating.coats : [];
    const effectiveRawNotes =
      coating?.rawNotes ||
      sanitizeNotes(cpo.coatingSpecs) ||
      sanitizeNotes(childJobCards[0]?.notes) ||
      null;
    const notesHasExt = effectiveRawNotes ? /\bEXT\s*:/i.test(effectiveRawNotes) : false;
    const notesHasInt = effectiveRawNotes ? /\bINT\s*:/i.test(effectiveRawNotes) : false;
    const notesHasRubber = effectiveRawNotes
      ? /\bR\/L\b|\brubber\b|\blining\b|\blagging\b|\bROT\b/i.test(effectiveRawNotes)
      : false;
    const hasRubber = coating?.hasInternalLining === true || notesHasRubber;
    const hasPaint = coats.length > 0 || notesHasExt || notesHasInt;
    const hasExternalPaint = coats.some((c: any) => c.area === "external") || notesHasExt;
    const hasInternalPaint =
      coats.some((c: any) => c.area === "internal") || (notesHasInt && !notesHasRubber);

    const planTypes: QcpPlanType[] = [];
    if (hasExternalPaint) planTypes.push(QcpPlanType.PAINT_EXTERNAL);
    if (hasInternalPaint) planTypes.push(QcpPlanType.PAINT_INTERNAL);
    if (hasRubber) planTypes.push(QcpPlanType.RUBBER);
    if (!hasPaint && !hasRubber) planTypes.push(QcpPlanType.PAINT_EXTERNAL);

    const existingByType = existing.reduce(
      (acc, plan) => ({ ...acc, [plan.planType]: plan }),
      {} as Record<string, QcControlPlan>,
    );

    const customerName = cpo.customerName || null;
    const orderNumber = cpo.poNumber || null;
    const jobNumber = cpo.jobNumber || null;
    const jobName = (cpo.jobName || "").trim() || null;

    const allDescriptions = childJobCards.flatMap((jc) =>
      (jc.lineItems || [])
        .map((li: any) => stripJunkSuffixes((li.itemDescription || "").trim()))
        .filter(
          (desc: string) =>
            desc.length > 0 && !INVALID_LINE_ITEM_PATTERNS.some((pattern) => pattern.test(desc)),
        ),
    );
    const itemDescriptions = [...new Set(allDescriptions)].join("; ");

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
    ): QcpActivity => ({
      operationNumber: opNum,
      description,
      specification: spec,
      procedureRequired: null,
      documentation: doc,
      pls: holdSignOff(),
      mps: emptySignOff(),
      client: emptySignOff(),
      thirdParty: emptySignOff(),
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
      const rubberSpec = extractSpecByArea(effectiveRawNotes, "INT");
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
        return extractSpecByArea(effectiveRawNotes, "INT") || effectiveRawNotes || null;
      }
      if (planType === QcpPlanType.PAINT_EXTERNAL || planType === QcpPlanType.PAINT_INTERNAL) {
        return extractSpecByArea(effectiveRawNotes, "EXT") || effectiveRawNotes || null;
      }
      return effectiveRawNotes || null;
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
        created.push(
          await this.controlPlanRepo.create({
            companyId,
            cpoId,
            jobCardId: null,
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
          }),
        );
      }
    }

    this.logger.log(
      `Auto-generated ${created.length} CPO-level QCP(s) for CPO ${cpoId}: ${planTypes.join(", ")}`,
    );

    for (const jc of childJobCards) {
      await this.propagateCpoQcpsToJobCard(companyId, cpoId, jc.id);
    }

    return created;
  }

  async propagateCpoQcpsToJobCard(
    companyId: number,
    cpoId: number,
    jobCardId: number,
  ): Promise<void> {
    const cpoQcps = await this.controlPlanRepo.findCpoLevelForCpo(companyId, cpoId);

    if (cpoQcps.length === 0) {
      return;
    }

    const existingJcQcps = await this.controlPlanRepo.findForJobCard(companyId, jobCardId);

    const existingByTypeAndSource = existingJcQcps.reduce(
      (acc, plan) => {
        const key = `${plan.planType}:${plan.sourceCpoQcpId || ""}`;
        return { ...acc, [key]: plan };
      },
      {} as Record<string, QcControlPlan>,
    );

    for (const cpoQcp of cpoQcps) {
      const key = `${cpoQcp.planType}:${cpoQcp.id}`;
      if (existingByTypeAndSource[key]) {
        continue;
      }

      await this.controlPlanRepo.create({
        companyId,
        jobCardId,
        cpoId,
        sourceCpoQcpId: cpoQcp.id,
        planType: cpoQcp.planType,
        qcpNumber: cpoQcp.qcpNumber,
        documentRef: cpoQcp.documentRef,
        revision: cpoQcp.revision,
        customerName: cpoQcp.customerName,
        orderNumber: cpoQcp.orderNumber,
        jobNumber: cpoQcp.jobNumber,
        jobName: cpoQcp.jobName,
        specification: cpoQcp.specification,
        itemDescription: cpoQcp.itemDescription,
        activities: JSON.parse(JSON.stringify(cpoQcp.activities)),
        approvalSignatures: JSON.parse(JSON.stringify(cpoQcp.approvalSignatures)),
        activeParties: cpoQcp.activeParties ? [...cpoQcp.activeParties] : null,
        clientEmail: cpoQcp.clientEmail,
        thirdPartyEmail: cpoQcp.thirdPartyEmail,
        createdByName: cpoQcp.createdByName,
        createdById: cpoQcp.createdById,
      });
    }

    this.logger.log(`Propagated ${cpoQcps.length} CPO QCP(s) to job card ${jobCardId}`);
  }

  // ── CPO-Level Items Release ─────────────────────────────────────

  async itemsReleasesForCpo(companyId: number, cpoId: number): Promise<QcItemsRelease[]> {
    return this.itemsReleaseRepo.findForCpo(companyId, cpoId);
  }

  async releasableItemsForCpo(
    companyId: number,
    cpoId: number,
  ): Promise<{
    items: {
      itemCode: string | null;
      itemNo: string | null;
      description: string | null;
      orderedQty: number;
      arrivedQty: number;
      releasedQty: number;
      remainingToRelease: number;
      deliveries: { jobCardId: number; jtNumber: string | null; quantity: number }[];
    }[];
  }> {
    const cpo = await this.cpoRepo.findOneForCompanyWithItems(cpoId, companyId);

    if (!cpo) {
      throw new NotFoundException(`CPO ${cpoId} not found`);
    }

    const childJobCards = await this.jobCardRepo.findForCpoWithLineItemsOrdered(cpoId, companyId);

    const matchesCpoItem = (
      liCode: string,
      liDesc: string,
      ciCode: string,
      ciDesc: string,
    ): boolean => {
      const hasCode = ciCode.length > 0 && liCode.length > 0;
      const hasDesc = ciDesc.length > 0 && liDesc.length > 0;
      if (hasCode && hasDesc) return ciCode === liCode && ciDesc === liDesc;
      if (hasCode) return ciCode === liCode;
      if (hasDesc) return ciDesc === liDesc;
      return false;
    };

    const existingCpoReleases = await this.itemsReleaseRepo.findForCpo(companyId, cpoId);

    const alreadyReleasedByKey = existingCpoReleases.reduce(
      (acc, release) =>
        release.items.reduce((inner, ri) => {
          const key = `${(ri.itemCode || "").toLowerCase()}||${(ri.description || "").toLowerCase()}`;
          const current = inner[key] || 0;
          return { ...inner, [key]: current + (ri.quantity || 0) };
        }, acc),
      {} as Record<string, number>,
    );

    const consolidatedItems = cpo.items
      .filter((ci) => Number(ci.quantityOrdered) > 0)
      .reduce<
        {
          itemCode: string | null;
          itemNo: string | null;
          itemDescription: string | null;
          totalOrdered: number;
          key: string;
        }[]
      >((acc, ci) => {
        const ciCode = (ci.itemCode || "").trim().toLowerCase();
        const ciDesc = (ci.itemDescription || "").trim().toLowerCase();
        const key = `${ciCode}||${ciDesc}`;
        const existing = acc.find((a) => a.key === key);
        if (existing) {
          existing.totalOrdered += Number(ci.quantityOrdered) || 0;
          return acc;
        }
        return [
          ...acc,
          {
            itemCode: ci.itemCode,
            itemNo: ci.itemNo ?? null,
            itemDescription: ci.itemDescription,
            totalOrdered: Number(ci.quantityOrdered) || 0,
            key,
          },
        ];
      }, []);

    const items = consolidatedItems.map((ci) => {
      const ciCode = (ci.itemCode || "").trim().toLowerCase();
      const ciDesc = (ci.itemDescription || "").trim().toLowerCase();

      const deliveries = childJobCards
        .map((jc) => {
          const matchedQty = (jc.lineItems || [])
            .filter((li) => {
              const code = (li.itemCode || "").trim().toLowerCase();
              const desc = (li.itemDescription || "").trim().toLowerCase();
              return matchesCpoItem(code, desc, ciCode, ciDesc);
            })
            .reduce((sum, li) => sum + (Number(li.quantity) || 0), 0);

          if (matchedQty === 0) return null;

          return {
            jobCardId: jc.id,
            jtNumber: jc.jtDnNumber,
            quantity: matchedQty,
          };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);

      const arrivedQty = deliveries.reduce((sum, d) => sum + d.quantity, 0);
      const releaseKey = `${ciCode}||${ciDesc}`;
      const alreadyReleased = alreadyReleasedByKey[releaseKey] || 0;
      const remainingToRelease = Math.max(0, arrivedQty - alreadyReleased);

      return {
        itemCode: ci.itemCode,
        itemNo: ci.itemNo,
        description: ci.itemDescription,
        orderedQty: ci.totalOrdered,
        arrivedQty,
        releasedQty: alreadyReleased,
        remainingToRelease,
        deliveries,
      };
    });

    return { items };
  }

  async autoGenerateReleaseDocumentsForCpo(
    companyId: number,
    cpoId: number,
    selectedItems: {
      itemCode: string;
      description: string;
      quantity: number;
      jobCardId: number;
    }[],
    user: UserContext,
    checkedBy?: { name: string; date: string; signature: string },
  ): Promise<{ cpoRelease: QcItemsRelease; childReleases: QcItemsRelease[] }> {
    if (selectedItems.length === 0) {
      throw new BadRequestException("No items selected for release");
    }

    const firstChildJcId = selectedItems[0].jobCardId;
    const specs = await this.coatingSpecsForJobCard(companyId, firstChildJcId);

    const cpo = await this.cpoRepo.findOneForCompanyWithItems(cpoId, companyId);
    const cpoItemNoLookup = new Map<string, string>();
    if (cpo) {
      cpo.items.forEach((ci) => {
        const code = (ci.itemCode || "").trim().toLowerCase();
        const desc = (ci.itemDescription || "").trim().toLowerCase();
        const key = `${code}||${desc}`;
        if (ci.itemNo) {
          cpoItemNoLookup.set(key, ci.itemNo);
        }
      });
    }

    const stripBanding = (spec: string | null): string | null => {
      if (!spec) return spec;
      const bandingIdx = spec.toUpperCase().indexOf("BANDING");
      if (bandingIdx < 0) return spec;
      return spec
        .substring(0, bandingIdx)
        .trim()
        .replace(/[+&,]\s*$/, "")
        .trim();
    };

    const cleanPaintingSpec = stripBanding(specs.paintingSpec);

    const cpoReleaseItems: ReleaseLineItem[] = selectedItems.map((si) => {
      const code = (si.itemCode || "").trim().toLowerCase();
      const desc = (si.description || "").trim().toLowerCase();
      const lookupKey = `${code}||${desc}`;
      return {
        itemCode: si.itemCode,
        description: si.description,
        jtNumber: null,
        rubberSpec: specs.rubberSpec,
        paintingSpec: cleanPaintingSpec,
        quantity: si.quantity,
        result: ItemReleaseResult.PASS,
        itemNo: cpoItemNoLookup.get(lookupKey) ?? null,
      };
    });

    const totalQuantity = cpoReleaseItems.reduce((sum, item) => sum + item.quantity, 0);

    const cpoRelease = await this.itemsReleaseRepo.create({
      companyId,
      cpoId,
      jobCardId: null,
      items: cpoReleaseItems,
      totalQuantity,
      createdByName: user.name,
      createdById: user.id,
      checkedByName: checkedBy?.name ?? null,
      checkedByDate: checkedBy?.date ?? null,
      checkedBySignature: checkedBy?.signature ?? null,
      plsSignOff: checkedBy
        ? { name: checkedBy.name, date: checkedBy.date, signatureUrl: checkedBy.signature }
        : { name: null, date: null, signatureUrl: null },
      mpsSignOff: { name: null, date: null, signatureUrl: null },
      clientSignOff: { name: null, date: null, signatureUrl: null },
      thirdPartySignOff: { name: null, date: null, signatureUrl: null },
    });

    const itemsByJobCard = selectedItems.reduce(
      (acc, si) => {
        const existing = acc[si.jobCardId] || [];
        return { ...acc, [si.jobCardId]: [...existing, si] };
      },
      {} as Record<number, typeof selectedItems>,
    );

    const childReleases: QcItemsRelease[] = [];

    for (const [jcIdStr, jcItems] of Object.entries(itemsByJobCard)) {
      const jcId = Number(jcIdStr);
      const jcSpecs = await this.coatingSpecsForJobCard(companyId, jcId);
      const cleanJcPaintingSpec = stripBanding(jcSpecs.paintingSpec);

      const jcCard = await this.jobCardRepo.findOneForCompanyWithLineItems(jcId, companyId);
      const jcItemNoLookup = new Map<string, string>();
      if (jcCard) {
        (jcCard.lineItems || []).forEach((li) => {
          const code = (li.itemCode || "").trim().toLowerCase();
          const desc = (li.itemDescription || "").trim().toLowerCase();
          const key = `${code}||${desc}`;
          if (li.itemNo) {
            jcItemNoLookup.set(key, li.itemNo);
          }
        });
      }

      const jcReleaseItems: ReleaseLineItem[] = jcItems.map((si) => {
        const code = (si.itemCode || "").trim().toLowerCase();
        const desc = (si.description || "").trim().toLowerCase();
        const lookupKey = `${code}||${desc}`;
        return {
          itemCode: si.itemCode,
          description: si.description,
          jtNumber: null,
          rubberSpec: jcSpecs.rubberSpec,
          paintingSpec: cleanJcPaintingSpec,
          quantity: si.quantity,
          result: ItemReleaseResult.PASS,
          itemNo: jcItemNoLookup.get(lookupKey) ?? cpoItemNoLookup.get(lookupKey) ?? null,
        };
      });

      const jcTotal = jcReleaseItems.reduce((sum, item) => sum + item.quantity, 0);

      const childRelease = await this.itemsReleaseRepo.create({
        companyId,
        jobCardId: jcId,
        cpoId: null,
        items: jcReleaseItems,
        totalQuantity: jcTotal,
        createdByName: user.name,
        createdById: user.id,
        checkedByName: checkedBy?.name ?? null,
        checkedByDate: checkedBy?.date ?? null,
        checkedBySignature: checkedBy?.signature ?? null,
        plsSignOff: checkedBy
          ? { name: checkedBy.name, date: checkedBy.date, signatureUrl: checkedBy.signature }
          : { name: null, date: null, signatureUrl: null },
        mpsSignOff: { name: null, date: null, signatureUrl: null },
        clientSignOff: { name: null, date: null, signatureUrl: null },
        thirdPartySignOff: { name: null, date: null, signatureUrl: null },
      });

      childReleases.push(childRelease);
    }

    this.logger.log(
      `Generated CPO release for CPO ${cpoId} with ${selectedItems.length} items, cascaded to ${childReleases.length} child JC(s)`,
    );

    return { cpoRelease, childReleases };
  }

  // ── CPO-Level Release Certificates ──────────────────────────────

  async releaseCertificatesForCpo(
    companyId: number,
    cpoId: number,
  ): Promise<QcReleaseCertificate[]> {
    return this.releaseCertRepo.findForCpo(companyId, cpoId);
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private async findOrFail<T extends QcEntity>(
    repo: CompanyScopedRepository<T>,
    companyId: number,
    id: number,
    label: string,
  ): Promise<T> {
    const record = await repo.findByIdForCompany(companyId, id);

    if (!record) {
      throw new NotFoundException(`${label} #${id} not found`);
    }

    return record;
  }
}
