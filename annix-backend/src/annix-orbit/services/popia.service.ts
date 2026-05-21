import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThan, Repository } from "typeorm";
import { DateTime } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import {
  AnnixOrbitCandidateEeAttributes,
  EeConsentSource,
  EeDisabilityStatus,
  EeGender,
  EeNationalityStatus,
  EePopulationGroup,
  EePurpose,
} from "../entities/annix-orbit-candidate-ee-attributes.entity";
import { AnnixOrbitEeConsentTextVersion } from "../entities/annix-orbit-ee-consent-text-version.entity";
import { Candidate } from "../entities/candidate.entity";
import { CandidateReference } from "../entities/candidate-reference.entity";
import { CvAuditService, ErasureReason } from "./cv-audit.service";

export interface RecordEeConsentInput {
  candidateId: number;
  populationGroup: EePopulationGroup;
  gender: EeGender;
  disabilityStatus: EeDisabilityStatus;
  requiresAccommodation: boolean;
  accommodationNotes: string | null;
  nationalityStatus: EeNationalityStatus;
  consentTextVersionId: number;
  consentSource: EeConsentSource;
  purposes: EePurpose[];
  actorId: number | null;
}

export type EeRequesterRole = "hr" | "candidate_self" | "system";

export interface EeAttributesView {
  populationGroup: EePopulationGroup;
  gender: EeGender;
  disabilityStatus: EeDisabilityStatus;
  requiresAccommodation: boolean;
  accommodationNotes: string | null;
  nationalityStatus: EeNationalityStatus;
  consentTextVersionId: number;
  consentGrantedAt: Date;
  purposes: EePurpose[];
}

export interface EeJobAggregate {
  jobPostingId: number;
  total: number;
  byPopulationGroup: Record<EePopulationGroup, number>;
  byGender: Record<EeGender, number>;
  byDisability: Record<EeDisabilityStatus, number>;
  byNationality: Record<EeNationalityStatus, number>;
}

export interface EeCompanyAggregate {
  companyId: number;
  dateFrom: Date;
  dateTo: Date;
  total: number;
  byPopulationGroup: Record<EePopulationGroup, number>;
  byGender: Record<EeGender, number>;
  byDisability: Record<EeDisabilityStatus, number>;
  byNationality: Record<EeNationalityStatus, number>;
}

@Injectable()
export class PopiaService {
  private readonly logger = new Logger(PopiaService.name);
  private static readonly RETENTION_MONTHS = 12;

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(CandidateReference)
    private readonly referenceRepo: Repository<CandidateReference>,
    @InjectRepository(AnnixOrbitCandidateEeAttributes)
    private readonly eeAttributesRepo: Repository<AnnixOrbitCandidateEeAttributes>,
    @InjectRepository(AnnixOrbitEeConsentTextVersion)
    private readonly eeConsentTextVersionRepo: Repository<AnnixOrbitEeConsentTextVersion>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly cvAuditService: CvAuditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: "annix-orbit:purge-inactive" })
  async purgeInactiveCandidates(): Promise<{ purged: number }> {
    if (!isAnnixOrbitCronEnabled()) return { purged: 0 };
    const cutoffDate = DateTime.now().minus({ months: PopiaService.RETENTION_MONTHS }).toJSDate();

    const inactiveCandidates = await this.candidateRepo.find({
      where: [
        { lastActiveAt: LessThan(cutoffDate) },
        { lastActiveAt: null as unknown as Date, createdAt: LessThan(cutoffDate) },
      ],
      relations: ["references"],
    });

    const purged = await inactiveCandidates.reduce(async (accPromise, candidate) => {
      const acc = await accPromise;
      try {
        await this.eraseCandidateData(candidate, "inactive");
        return acc + 1;
      } catch (error) {
        this.logger.error(
          `Failed to purge candidate ${candidate.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return acc;
      }
    }, Promise.resolve(0));

    if (purged > 0) {
      this.logger.log(
        `POPIA retention: purged ${purged} inactive candidates (${PopiaService.RETENTION_MONTHS}+ months)`,
      );
    }

    return { purged };
  }

  async eraseCandidateData(
    candidate: Candidate,
    reason: ErasureReason = "requested",
  ): Promise<void> {
    const candidateId = candidate.id;

    if (candidate.cvFilePath) {
      try {
        await this.storageService.delete(candidate.cvFilePath);
      } catch (error) {
        this.logger.warn(
          `Could not delete CV file for candidate ${candidate.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (candidate.references?.length > 0) {
      await this.referenceRepo.remove(candidate.references);
    }

    await this.candidateRepo.remove(candidate);

    await this.cvAuditService.logCvErasure(candidateId, reason);
  }

  async rightToErasure(companyId: number, candidateId: number): Promise<{ message: string }> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting", "references"],
    });

    if (!candidate || candidate.jobPosting.companyId !== companyId) {
      return { message: "Candidate not found" };
    }

    await this.eraseCandidateData(candidate, "requested");

    this.logger.log(
      `POPIA right to erasure exercised for candidate ${candidateId} by company ${companyId}`,
    );

    return {
      message: "All candidate data has been permanently deleted per POPIA right to erasure",
    };
  }

  async retentionStats(companyId: number): Promise<{
    totalCandidates: number;
    expiringWithin30Days: number;
    withConsent: number;
    withoutConsent: number;
  }> {
    const thirtyDaysFromExpiry = DateTime.now()
      .minus({ months: PopiaService.RETENTION_MONTHS })
      .plus({ days: 30 })
      .toJSDate();

    const expiryDate = DateTime.now().minus({ months: PopiaService.RETENTION_MONTHS }).toJSDate();

    const candidates = await this.candidateRepo
      .createQueryBuilder("candidate")
      .innerJoin("candidate.jobPosting", "jobPosting")
      .where("jobPosting.companyId = :companyId", { companyId })
      .getMany();

    const expiringWithin30Days = candidates.filter((c) => {
      const activeDate = c.lastActiveAt || c.createdAt;
      return activeDate <= thirtyDaysFromExpiry && activeDate > expiryDate;
    }).length;

    const withConsent = candidates.filter((c) => c.popiaConsent).length;

    return {
      totalCandidates: candidates.length,
      expiringWithin30Days,
      withConsent,
      withoutConsent: candidates.length - withConsent,
    };
  }

  async activeConsentTextVersion(): Promise<AnnixOrbitEeConsentTextVersion | null> {
    const activeNow = DateTime.now().toJSDate();
    const active = await this.eeConsentTextVersionRepo.findOne({
      where: [{ effectiveFrom: LessThan(activeNow), effectiveTo: IsNull() }],
      order: { effectiveFrom: "DESC" },
    });
    return active;
  }

  async recordEeConsent(input: RecordEeConsentInput): Promise<AnnixOrbitCandidateEeAttributes> {
    const candidate = await this.candidateRepo.findOne({ where: { id: input.candidateId } });
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    const consentTextVersion = await this.eeConsentTextVersionRepo.findOne({
      where: { id: input.consentTextVersionId },
    });
    if (!consentTextVersion) {
      throw new NotFoundException("Consent text version not found");
    }

    const tombstoneResult = await this.eeAttributesRepo.update(
      { candidateId: input.candidateId, deletedAt: IsNull() },
      { deletedAt: DateTime.now().toJSDate() },
    );
    const isCorrection = (tombstoneResult.affected ?? 0) > 0;

    const newRow = this.eeAttributesRepo.create({
      candidateId: input.candidateId,
      populationGroup: input.populationGroup,
      gender: input.gender,
      disabilityStatus: input.disabilityStatus,
      requiresAccommodation: input.requiresAccommodation,
      accommodationNotes: input.accommodationNotes,
      nationalityStatus: input.nationalityStatus,
      consentTextVersionId: input.consentTextVersionId,
      consentGrantedAt: DateTime.now().toJSDate(),
      consentSource: input.consentSource,
      purposes: input.purposes,
    });
    const saved = await this.eeAttributesRepo.save(newRow);

    await this.cvAuditService.logEeAttributesAction(
      input.candidateId,
      isCorrection ? "correction_recorded" : "consent_recorded",
      input.consentSource,
      input.actorId,
      input.consentTextVersionId,
    );

    return saved;
  }

  async eeAttributesForCandidate(
    candidateId: number,
    requesterRole: EeRequesterRole,
    actorId: number | null,
  ): Promise<EeAttributesView | null> {
    if (requesterRole === "system") {
      throw new ForbiddenException("System role may not read EE attributes");
    }

    const row = await this.eeAttributesRepo.findOne({
      where: { candidateId, deletedAt: IsNull() },
    });

    await this.cvAuditService.logEeAttributesAccess(
      candidateId,
      requesterRole === "hr" ? "hr_view" : "candidate_self",
      actorId,
    );

    if (!row) return null;

    return {
      populationGroup: row.populationGroup,
      gender: row.gender,
      disabilityStatus: row.disabilityStatus,
      requiresAccommodation: row.requiresAccommodation,
      accommodationNotes: row.accommodationNotes,
      nationalityStatus: row.nationalityStatus,
      consentTextVersionId: row.consentTextVersionId,
      consentGrantedAt: row.consentGrantedAt,
      purposes: row.purposes,
    };
  }

  async tombstoneEeAttributes(candidateId: number, actorId: number | null): Promise<void> {
    const updated = await this.eeAttributesRepo.update(
      { candidateId, deletedAt: IsNull() },
      { deletedAt: DateTime.now().toJSDate() },
    );

    if (updated.affected && updated.affected > 0) {
      await this.cvAuditService.logEeAttributesAction(
        candidateId,
        "tombstoned",
        "hr_recorded",
        actorId,
      );
    }
  }

  async aggregateForJob(jobPostingId: number, actorId: number | null): Promise<EeJobAggregate> {
    const rows = await this.eeAttributesRepo
      .createQueryBuilder("ee")
      .innerJoin("cv_assistant_candidates", "candidate", "candidate.id = ee.candidate_id")
      .where("candidate.job_posting_id = :jobPostingId", { jobPostingId })
      .andWhere("ee.deleted_at IS NULL")
      .select([
        "ee.population_group AS population_group",
        "ee.gender AS gender",
        "ee.disability_status AS disability_status",
        "ee.nationality_status AS nationality_status",
      ])
      .getRawMany<{
        population_group: EePopulationGroup;
        gender: EeGender;
        disability_status: EeDisabilityStatus;
        nationality_status: EeNationalityStatus;
      }>();

    await this.cvAuditService.logEeAttributesAccess(
      0,
      "ee_report",
      actorId,
      `aggregate_for_job:${jobPostingId}`,
    );

    return {
      jobPostingId,
      total: rows.length,
      byPopulationGroup: this.tally(rows, "population_group", PopulationGroupValues),
      byGender: this.tally(rows, "gender", GenderValues),
      byDisability: this.tally(rows, "disability_status", DisabilityValues),
      byNationality: this.tally(rows, "nationality_status", NationalityValues),
    };
  }

  async aggregateForCompany(
    companyId: number,
    dateFrom: Date,
    dateTo: Date,
    actorId: number | null,
  ): Promise<EeCompanyAggregate> {
    const rows = await this.eeAttributesRepo
      .createQueryBuilder("ee")
      .innerJoin("cv_assistant_candidates", "candidate", "candidate.id = ee.candidate_id")
      .innerJoin(
        "cv_assistant_job_postings",
        "job_posting",
        "job_posting.id = candidate.job_posting_id",
      )
      .where("job_posting.company_id = :companyId", { companyId })
      .andWhere("ee.deleted_at IS NULL")
      .andWhere("ee.consent_granted_at >= :dateFrom", { dateFrom })
      .andWhere("ee.consent_granted_at < :dateTo", { dateTo })
      .select([
        "ee.population_group AS population_group",
        "ee.gender AS gender",
        "ee.disability_status AS disability_status",
        "ee.nationality_status AS nationality_status",
      ])
      .getRawMany<{
        population_group: EePopulationGroup;
        gender: EeGender;
        disability_status: EeDisabilityStatus;
        nationality_status: EeNationalityStatus;
      }>();

    await this.cvAuditService.logEeAttributesAccess(
      0,
      "ee_report",
      actorId,
      `aggregate_for_company:${companyId}`,
    );

    return {
      companyId,
      dateFrom,
      dateTo,
      total: rows.length,
      byPopulationGroup: this.tally(rows, "population_group", PopulationGroupValues),
      byGender: this.tally(rows, "gender", GenderValues),
      byDisability: this.tally(rows, "disability_status", DisabilityValues),
      byNationality: this.tally(rows, "nationality_status", NationalityValues),
    };
  }

  private tally<T extends string, K extends string>(
    rows: Array<Record<K, T>>,
    key: K,
    values: readonly T[],
  ): Record<T, number> {
    const seed = values.reduce(
      (acc, value) => {
        acc[value] = 0;
        return acc;
      },
      {} as Record<T, number>,
    );

    return rows.reduce((acc, row) => {
      const bucket = row[key];
      acc[bucket] = (acc[bucket] ?? 0) + 1;
      return acc;
    }, seed);
  }
}

const PopulationGroupValues = [
  EePopulationGroup.AFRICAN_BLACK,
  EePopulationGroup.COLOURED,
  EePopulationGroup.INDIAN,
  EePopulationGroup.WHITE,
  EePopulationGroup.PREFER_NOT_TO_SAY,
] as const;

const GenderValues = [
  EeGender.FEMALE,
  EeGender.MALE,
  EeGender.OTHER,
  EeGender.PREFER_NOT_TO_SAY,
] as const;

const DisabilityValues = [
  EeDisabilityStatus.YES,
  EeDisabilityStatus.NO,
  EeDisabilityStatus.PREFER_NOT_TO_SAY,
] as const;

const NationalityValues = [
  EeNationalityStatus.SA_CITIZEN,
  EeNationalityStatus.SA_PERMANENT_RESIDENT,
  EeNationalityStatus.FOREIGN_NATIONAL,
  EeNationalityStatus.PREFER_NOT_TO_SAY,
] as const;
