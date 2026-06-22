import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
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
import { AnnixOrbitCandidateEeAttributesRepository } from "../repositories/annix-orbit-candidate-ee-attributes.repository";
import { AnnixOrbitEeConsentTextVersionRepository } from "../repositories/annix-orbit-ee-consent-text-version.repository";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateReferenceRepository } from "../repositories/candidate-reference.repository";
import { JobPostingRepository } from "../repositories/job-posting.repository";
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
    private readonly candidateRepo: CandidateRepository,
    private readonly referenceRepo: CandidateReferenceRepository,
    private readonly eeAttributesRepo: AnnixOrbitCandidateEeAttributesRepository,
    private readonly eeConsentTextVersionRepo: AnnixOrbitEeConsentTextVersionRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly cvAuditService: CvAuditService,
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly jobPostingRepo: JobPostingRepository,
  ) {}

  // Raw ID/passport images are only retained while a review/mismatch waits for
  // an admin. Anything unresolved after the retention window is deleted - the
  // extracted fields and document hash remain (issue #359, POPIA minimisation).
  private static readonly IDENTITY_DOC_RETENTION_DAYS = 30;

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: "annix-orbit:identity-doc-retention" })
  async purgeRetainedIdentityDocuments(): Promise<{ purged: number }> {
    if (!isAnnixOrbitCronEnabled()) return { purged: 0 };
    const cutoff = DateTime.now().minus({ days: PopiaService.IDENTITY_DOC_RETENTION_DAYS });
    const profiles = await this.profileRepo.findByIdentityStatuses([
      "review",
      "mismatch",
      "failed",
      "ai-checked",
    ]);
    let purged = 0;
    for (const profile of profiles) {
      const iv = profile.identityVerification;
      if (!iv?.documentFilePath || !iv.checkedAt) continue;
      const checkedAt = DateTime.fromISO(iv.checkedAt);
      if (!checkedAt.isValid || checkedAt > cutoff) continue;
      try {
        await this.storageService.delete(iv.documentFilePath);
        profile.identityVerification = { ...iv, documentFilePath: null };
        await this.profileRepo.save(profile);
        purged += 1;
      } catch (error) {
        this.logger.warn(
          `Could not purge identity document for profile ${profile.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    if (purged > 0) {
      this.logger.log(`POPIA retention: purged ${purged} retained identity document(s)`);
    }
    return { purged };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: "annix-orbit:purge-inactive" })
  async purgeInactiveCandidates(): Promise<{ purged: number }> {
    if (!isAnnixOrbitCronEnabled()) return { purged: 0 };
    const cutoffDate = DateTime.now().minus({ months: PopiaService.RETENTION_MONTHS }).toJSDate();

    const inactiveCandidates = await this.candidateRepo.findInactiveBefore(cutoffDate);

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
      await this.referenceRepo.removeMany(candidate.references);
    }

    await this.candidateRepo.remove(candidate);

    await this.cvAuditService.logCvErasure(candidateId, reason);
  }

  async rightToErasure(companyId: number, candidateId: number): Promise<{ message: string }> {
    const candidate = await this.candidateRepo.findByIdWithJobAndReferences(candidateId);

    if (!candidate?.jobPosting || candidate.jobPosting.companyId !== companyId) {
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

    const candidates = await this.candidateRepo.candidatesForCompany(companyId);

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
    return this.eeConsentTextVersionRepo.activeOpenEnded(activeNow);
  }

  async recordEeConsent(input: RecordEeConsentInput): Promise<AnnixOrbitCandidateEeAttributes> {
    const candidate = await this.candidateRepo.findById(input.candidateId);
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    const consentTextVersion = await this.eeConsentTextVersionRepo.findById(
      input.consentTextVersionId,
    );
    if (!consentTextVersion) {
      throw new NotFoundException("Consent text version not found");
    }

    const tombstonedCount = await this.eeAttributesRepo.tombstoneActiveForCandidate(
      input.candidateId,
      DateTime.now().toJSDate(),
    );
    const isCorrection = tombstonedCount > 0;

    const saved = await this.eeAttributesRepo.create({
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

    const row = await this.eeAttributesRepo.findActiveForCandidate(candidateId);

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

  async hasActiveEeAttributes(candidateId: number): Promise<boolean> {
    const row = await this.eeAttributesRepo.findActiveForCandidate(candidateId);
    return row !== null;
  }

  async tombstoneEeAttributes(candidateId: number, actorId: number | null): Promise<void> {
    const tombstonedCount = await this.eeAttributesRepo.tombstoneActiveForCandidate(
      candidateId,
      DateTime.now().toJSDate(),
    );

    if (tombstonedCount > 0) {
      await this.cvAuditService.logEeAttributesAction(
        candidateId,
        "tombstoned",
        "hr_recorded",
        actorId,
      );
    }
  }

  async aggregateForJob(
    companyId: number,
    jobPostingId: number,
    actorId: number | null,
  ): Promise<EeJobAggregate> {
    const posting = await this.jobPostingRepo.findByIdForCompany(jobPostingId, companyId);
    if (!posting) {
      throw new NotFoundException("Job posting not found");
    }
    const rows = await this.eeAttributesRepo.aggregateForJob(jobPostingId);

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
    const rows = await this.eeAttributesRepo.aggregateForCompany(companyId, dateFrom, dateTo);

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
