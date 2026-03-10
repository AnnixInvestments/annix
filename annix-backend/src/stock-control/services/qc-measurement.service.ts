import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobCard } from "../entities/job-card.entity";
import { QcBlastProfile } from "../entities/qc-blast-profile.entity";
import { QcControlPlan } from "../entities/qc-control-plan.entity";
import { QcDftReading } from "../entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "../entities/qc-dust-debris-test.entity";
import {
  ItemReleaseResult,
  QcItemsRelease,
  ReleaseLineItem,
} from "../entities/qc-items-release.entity";
import { QcPullTest } from "../entities/qc-pull-test.entity";
import { QcReleaseCertificate } from "../entities/qc-release-certificate.entity";
import { QcShoreHardness } from "../entities/qc-shore-hardness.entity";

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
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
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
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
      relations: ["lineItems"],
    });

    if (!jobCard) {
      throw new NotFoundException(`Job card #${jobCardId} not found`);
    }

    const items: ReleaseLineItem[] = (jobCard.lineItems ?? []).map((li) => ({
      itemCode: li.itemCode ?? "",
      description: li.itemDescription ?? "",
      jtNumber: li.jtNo ?? null,
      rubberSpec: null,
      paintingSpec: null,
      quantity: Number(li.quantity) || 0,
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
